// Next.js API route to handle chat queries
import 'dotenv/config'
import { OpenAI } from 'openai'          // official OpenAI client (some parts use LangChain)
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { upsertDocuments, searchNearest } from '../../lib/vectorStore.js'

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
    const { question, history } = req.body
    if (!question) return res.status(400).json({ error: 'question required' })

    // 1) Embed the question
    const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY })
    const qEmbArr = await embeddings.embedQuery(question) // single vector (array of numbers)

    // 2) Retrieve top-K similar docs from Astra
    const top = await searchNearest(qEmbArr, 5)
    // Build context text by concatenating the content of retrieved docs
    const contextText = top.map((t, i) => `Source ${i+1}:\n${t.content}\n`).join('\n---\n')

    // 3) Call OpenAI (chat/completion) with the retrieved context (RAG)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    const prompt = [
      { role: 'system', content: 'You are a helpful assistant. Use the provided context to answer user questions. If the answer is not in the context, be honest.' },
      { role: 'user', content: `Context:\n${contextText}\n\nQuestion:\n${question}` }
    ]
    // If you want conversation history, you can include it in messages (history is expected as array)
    if (Array.isArray(history)) {
      // Append history as chat messages before the current user message if needed
    }

    // Using the Chat Completions API (OpenAI SDK v4+)
    const chatRes = await openai.chat.completions.create({
      model,
      messages: prompt,
      max_tokens: 600,
      temperature: 0.2
    })
    const answer = chatRes.choices?.[0]?.message?.content ?? 'Sorry, no answer.'

    // Return answer + sources
    return res.status(200).json({ answer, sources: top })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || err })
  }
}
