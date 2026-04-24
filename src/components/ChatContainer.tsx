import { useState, useCallback } from 'react'
import type { Message } from '../types'
import { AgentCore, type AgentStatus } from '../agent/core'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export function ChatContainer() {
  const [expanded, setExpanded] = useState(false)
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

  const statusLabel = { idle: '就绪', thinking: '思考中...', error: '错误', aborted: '已中止' }[status]

  // Floating widget at bottom-right
  return (
    <>
      {/* Floating toggle button */}
      <div
        onClick={() => setExpanded((v) => !v)}
        title="TODO Assistant"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#007AFF',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: 24,
          userSelect: 'none',
        }}
      >
        💬
      </div>

      {/* Expanded chat panel */}
      {expanded && (
        <div
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 380,
            height: 520,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #ddd',
            borderRadius: 12,
            background: '#fff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            zIndex: 9998,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #eee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            <span style={{ fontWeight: 600 }}>TODO Assistant</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  color:
                    status === 'thinking' ? '#007AFF' : status === 'error' ? '#c62828' : status === 'aborted' ? '#e65100' : '#888',
                }}
              >
                {statusLabel}
              </span>
              {status === 'thinking' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    agentRef?.abort()
                  }}
                  style={{
                    background: '#ff3b30',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 11,
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  停止
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  agentRef?.resetMessages()
                  setMessages([])
                  setStatus('idle')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: '#007AFF',
                  padding: '0 2px',
                }}
              >
                新建对话
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(false)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#999',
                  padding: '0 2px',
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Messages */}
          <MessageList messages={messages} />

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #eee', flexShrink: 0 }}>
            <ChatInput
              onSend={handleSend}
              disabled={status === 'thinking' || !agentRef}
            />
          </div>
        </div>
      )}
    </>
  )
}
