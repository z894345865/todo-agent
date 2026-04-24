import { useState } from 'react'
import { useTodoStore } from '../store'

export function TodoInput() {
  const [text, setText] = useState('')
  const add = useTodoStore((s) => s.add)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    await add(trimmed)
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加新任务..."
        style={{
          flex: 1,
          padding: '8px 12px',
          fontSize: 16,
          border: '1px solid #ddd',
          borderRadius: 6,
          outline: 'none',
        }}
      />
      <button
        type="submit"
        style={{
          padding: '8px 16px',
          fontSize: 16,
          background: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: 'pointer',
        }}
      >
        添加
      </button>
    </form>
  )
}