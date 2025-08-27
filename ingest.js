// Ingest script: reads .txt files from /data, computes embeddings, upserts to Astra table.
// Usage: npm run ingest

import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { embedText, upsertDocuments } from '../lib/vectorStore.js'
import { v4 as uuidv4 } from 'uuid'

async function main() {
  const DATA_DIR = path.join(process.cwd(), 'data')
  if (!fs.existsSync(DATA_DIR)) {
    console.error('Create a data/ folder and add .txt files to ingest.')
    process.exit(1)
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.txt'))
  if (files.length === 0) {
    console.error('No .txt files found in data/')
    process.exit(1)
  }

  const texts = files.map(f => fs.readFileSync(path.join(DATA_DIR, f), 'utf8'))
  console.log(`Embedding ${texts.length} docs...`)
  const embeddings = await embedText(texts) // returns array of vectors
  const docs = files.map((file, idx) => ({
    id: uuidv4(),
    content: texts[idx],
    metadata: { source: file },
    embedding: embeddings[idx]
  }))

  console.log('Upserting docs to Astra...')
  const res = await upsertDocuments(docs)
  console.log('Upsert result:', res)
  console.log('Ingest complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
