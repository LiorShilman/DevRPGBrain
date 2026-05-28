import { useEffect, useRef, useState } from 'react'
import { brainApi, ChatMessage } from '../services/api'

const SUGGESTIONS = [
  'On which project should I focus today?',
  'Which projects are at risk or abandoned?',
  'What are my open blockers across all projects?',
  'Give me a summary of where I stand across all projects.',
  'Which project has the most pending next steps?',
  'Compare the health of all my projects.',
]

export default function GlobalBrainPage() {
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const q = input.trim()
    if (!q || loading) return
    const userMsg: ChatMessage = { role: 'user', content: q }
    setHistory((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError(null)
    try {
      const { reply } = await brainApi.chatGlobal(q, [...history, userMsg])
      setHistory((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Global Brain error')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e as unknown as React.FormEvent)
    }
  }

  function handleSuggestion(s: string) {
    setInput(s)
    inputRef.current?.focus()
  }

  return (
    <div className="page global-brain-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="global-brain-icon">◈</span> Global Brain
          </h1>
          <p className="page-subtitle">AI chat across all your projects — priorities, risks, context</p>
        </div>
        {history.length > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => setHistory([])}>
            Clear chat
          </button>
        )}
      </div>

      <div className="global-brain-body">
        <div className="global-brain-messages">
          {history.length === 0 && (
            <div className="brain-empty">
              <p className="brain-empty-hint">
                Ask anything about your projects — the AI knows all of them.
              </p>
              <div className="brain-suggestions global-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" className="brain-suggestion" onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div key={i} className={`brain-msg brain-msg-${msg.role}`}>
              <span className="brain-msg-label">{msg.role === 'user' ? 'You' : '◈ Global Brain'}</span>
              <p className="brain-msg-text">{msg.content}</p>
            </div>
          ))}

          {loading && (
            <div className="brain-msg brain-msg-assistant brain-thinking">
              <span className="brain-msg-label">◈ Global Brain</span>
              <p className="brain-msg-text">Analyzing all projects…</p>
            </div>
          )}

          {error && <p className="brain-error">{error}</p>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="brain-input-row global-brain-input-row">
          <textarea
            ref={inputRef}
            className="brain-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about all your projects… (Enter to send, Shift+Enter for newline)"
            rows={2}
            disabled={loading}
          />
          <button type="submit" className="btn-primary brain-send" disabled={loading || !input.trim()}>
            ↑
          </button>
        </form>
      </div>
    </div>
  )
}
