import Head from 'next/head'
import dynamic from 'next/dynamic'
const ChatBox = dynamic(() => import('../components/ChatBox'), { ssr: false })

export default function Home() {
  return (
    <>
      <Head>
        <title>RAG Chatbot (AstraDB)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
        <h1>RAG Chatbot (DataStax Astra)</h1>
        <p>Ask questions about the ingested documents.</p>
        <ChatBox />
      </main>
    </>
  )
}
