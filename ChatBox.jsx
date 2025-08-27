'use client'
import { useState } from 'react'

export default function ChatBox() {
  const [messages, setMessages] = useState([]) // { from: 'user'|'bot', text }
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function sendMessage(e) {
    e?.preventDefault()
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    setMessages(m => [...m, userMsg])
    setLoading(true)
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, history: messages.filter(m=>m.from) })
      })
      const data = await resp.json()
      const botText = data.answer ?? data?.text ?? 'No answer.'
      setMessages(m => [...m, { from: 'bot', text: botText }])
    } catch (err) {
      setMessages(m => [...m, { from: 'bot', text: 'Error: ' + (err.message || err) }])
    } finally {
      setInput('')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ border: '1px solid #ddd', padding: 12, minHeight: 300, marginBottom: 12 }}>
        {messages.length === 0 && <div style={{ color: '#666' }}>No messages yet — ask something!</div>}
        {messages.map((m,i) => (
          <div key={i} style={{ margin: '8px 0' }}>
            <strong style={{ display: 'inline-block', width: 60 }}>{m.from === 'user' ? 'You:' : 'Bot:'}</strong>
            <span style={{ marginLeft: 8 }}>{m.text}</span>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question..."
          style={{ flex: 1, padding: '10px 12px' }}
        />
        <button type="submit" disabled={loading} style={{ padding: '10px 12px' }}>
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
