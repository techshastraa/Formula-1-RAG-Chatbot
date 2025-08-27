// Wrapper client for DataStax Astra DB (Vector API via REST)
// We'll use Astra's REST API for simplicity: token auth and endpoints to upsert/query vectors.
// NOTE: DataStax provides different integration options; this wrapper uses the HTTP API.

import fetch from 'node-fetch'

const ASTRA_DB_ID = process.env.ASTRA_DB_ID
const ASTRA_DB_REGION = process.env.ASTRA_DB_REGION
const ASTRA_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN
const KEYSPACE = process.env.ASTRA_DB_KEYSPACE

if (!ASTRA_DB_ID || !ASTRA_DB_REGION || !ASTRA_TOKEN || !KEYSPACE) {
  // not throwing to allow client-side builds — only used server-side
}

const BASE_URL = `https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/rest/v2`

export async function astraRequest(path, method = 'GET', body = null) {
  const url = `${BASE_URL}${path}`
  const headers = {
    'X-Cassandra-Token': ASTRA_TOKEN,
    'Content-Type': 'application/json'
  }
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch(e){ json = text }
  if (!res.ok) {
    const err = new Error(`Astra request failed: ${res.status} ${res.statusText} ${JSON.stringify(json)}`)
    err.status = res.status
    throw err
  }
  return json
}
