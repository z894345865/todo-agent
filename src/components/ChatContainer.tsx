import { useState, useCallback, useRef } from 'react'
import type { Message } from '../types'
import { AgentCore, type AgentStatus } from '../agent/core'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatContainer() {
  const [messages, setMessages] = useState<Message[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')

  const baseURL = import.meta.env.VITE_LLM_BASE_URL
  const apiKey = import.meta.env.VITE_LLM_API_KEY
  const model = import.meta.env.VITE_LLM_MODEL || 'qwen3.5-plus'
  const language = import.meta.env.VITE_LLM_LANGUAGE || 'zh-CN'

  const agentRef = useState<AgentCore | null>(() => {
    if (!apiKey || !baseURL) {
      console.warn('LLM not configured — set VITE_LLM_BASE_URL and VITE_LLM_API_KEY in .env')
      return null
    }
    return new AgentCore({
      baseURL,
      apiKey,
      model,
      language,
      onStatusChange: setStatus,
      onMessage: (msg) => {
        setMessages((prev) => [...prev, msg])
      },
    })
  })[0]

  const handleSend = useCallback(
    async (content: string) => {
      if (!agentRef) return
      try {
        await agentRef.sendUserMessage(content)
      } catch (e) {
        const errorMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          timestamp: Date.now(),
          type: 'error',
          content: String(e),
        }
        setMessages((prev) => [...prev, errorMsg])
      }
    },
    [agentRef]
  )

  const statusLabel = { idle: '就绪', thinking: '思考中...', error: '错误' }[status]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 400,
        maxHeight: 600,
        border: '1px solid #ddd',
        borderRadius: 12,
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
        }}
      >
        <span style={{ fontWeight: 600 }}>TODO Assistant</span>
        <span style={{ color: status === 'thinking' ? '#007AFF' : status === 'error' ? '#c62828' : '#888' }}>
          {statusLabel}
        </span>
      </div>
      <MessageList messages={messages} />
      <div style={{ padding: '12px 16px', borderTop: '1px solid #eee' }}>
        <ChatInput onSend={handleSend} disabled={status === 'thinking' || !agentRef} />
      </div>
    </div>
  )
}