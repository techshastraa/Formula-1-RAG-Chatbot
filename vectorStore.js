// Vector store helper using LangChain's OpenAIEmbeddings + a light wrapper to store vectors in Astra.
// We'll use OpenAI embeddings to compute vectors and then upsert to Astra via REST API.
// NOTE: This is a simple implementation for tutorial/demo purposes. For production use
// prefer DataStax's official vector extensions or plugin supported by LangChain.

import 'dotenv/config'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import fetch from 'node-fetch'
import { astraRequest } from './astraClient.js'

const TABLE = 'documents' // Cassandra table in Astra to hold id, content, metadata, embedding

export async function embedText(texts = []) {
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY })
  // OpenAIEmbeddings has embedDocuments method
  const embs = await embeddings.embedDocuments(texts)
  return embs
}

/**
 * Upsert many docs into Astra documents table.
 * Assumes table schema: id(text) PRIMARY KEY, content text, metadata text (json string), embedding list<double>
 *
 * You'll need to create the table in Astra CQL:
 *
 * CREATE TABLE IF NOT EXISTS your_keyspace.documents (
 *   id text PRIMARY KEY,
 *   content text,
 *   metadata text,
 *   embedding list<double>
 * );
 *
 * Note: Astra's REST upsert is done via the "/keyspaces/{ks}/tables/{table}/rows" endpoint.
 */
export async function upsertDocuments(docs = []) {
  // docs: [{ id, content, metadata, embedding }]
  // Format rows for Astra REST
  const path = `/schemas/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/tables/${TABLE}/rows`
  // Astra REST for upsert expects rows array with column values map
  const payload = {
    rows: docs.map(d => ({
      primaryKey: { id: d.id },
      columns: [
        { name: "id", value: d.id },
        { name: "content", value: d.content },
        { name: "metadata", value: JSON.stringify(d.metadata ?? {}) },
        { name: "embedding", value: d.embedding }
      ]
    }))
  }
  // Note: Astra REST may differ; you might need to adapt to the exact API for your Astra account.
  const res = await astraRequest(`/apis/rest/v2/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/tables/${TABLE}/rows`, 'POST', payload)
  return res
}

/**
 * Simple nearest neighbor search by computing cosine similarity in Node:
 * - Pull candidate rows (you could pull all or filtered subset)
 * - Compute cosine similarity between query embedding and stored embeddings
 * - Return top K
 *
 * This is inefficient for large datasets. Use an index or DataStax Vector Index in production.
 */
export function cosineSim(a, b) {
  // a and b are arrays of numbers
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10)
}

export async function searchNearest(queryEmbedding, topK = 5) {
  // Fetch all rows (demo). For large datasets implement filtering or use DataStax vector index.
  const rows = await astraRequest(`/apis/rest/v2/keyspaces/${process.env.ASTRA_DB_KEYSPACE}/tables/${TABLE}/rows`, 'GET')
  // rows.items or rows... adapt depending on response
  const items = rows?.rows ?? rows?.items ?? rows ?? []
  // Map to objects with embeddings
  const scored = []
  for (const r of items) {
    const storedEmb = r.columns?.find(c => c.name === 'embedding')?.value ?? r.embedding ?? null
    const content = r.columns?.find(c => c.name === 'content')?.value ?? r.content
    const metadataStr = r.columns?.find(c => c.name === 'metadata')?.value ?? r.metadata
    let storedEmbedding = storedEmb
    if (!storedEmbedding && r.embedding) storedEmbedding = r.embedding
    if (!storedEmbedding) continue
    const parsedEmbedding = Array.isArray(storedEmbedding) ? storedEmbedding : JSON.parse(storedEmbedding)
    const score = cosineSim(queryEmbedding, parsedEmbedding)
    scored.push({ score, content, metadata: metadataStr ? JSON.parse(metadataStr) : {} })
  }
  scored.sort((a,b) => b.score - a.score)
  return scored.slice(0, topK)
}
