import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息..."
        disabled={disabled}
        rows={1}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: 8,
          resize: 'none',
          fontFamily: 'inherit',
          fontSize: 14,
          lineHeight: 1.4,
          maxHeight: 120,
          overflowY: 'auto',
        }}
        onInput={(e) => {
          const t = e.target as HTMLTextAreaElement
          t.style.height = 'auto'
          t.style.height = Math.min(t.scrollHeight, 120) + 'px'
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        style={{
          padding: '8px 16px',
          background: disabled ? '#ccc' : '#007AFF',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        发送
      </button>
    </div>
  )
}