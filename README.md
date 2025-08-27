# RAG Chatbot (Next.js + LangChain.js + DataStax Astra)

## What this project does
A simple Retrieval-Augmented Generation (RAG) demo:
- Ingest text files into DataStax Astra with OpenAI embeddings.
- Query a Next.js API route that retrieves top-K relevant documents and asks OpenAI to answer using that context.
- Simple Next.js frontend chat UI.

## Setup

1. Create DataStax Astra DB instance and Keyspace.
2. Create a table named `documents` with columns: `id text PRIMARY KEY`, `content text`, `metadata text`, `embedding list<double>`.
   Example CQL:
   ```sql
   CREATE TABLE IF NOT EXISTS your_keyspace.documents (
     id text PRIMARY KEY,
     content text,
     metadata text,
     embedding list<double>
   );
