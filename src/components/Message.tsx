import ReactMarkdown from 'react-markdown'
import type { Message, TextMessage, ToolCallMessage, ToolResultMessage, ErrorMessage } from '../types'
import { ToolCallCard } from './ToolCallCard'
import { ToolResultCard } from './ToolResultCard'

interface MessageProps {
  message: Message
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  if (message.type === 'tool_call') {
    const tc = message as ToolCallMessage
    return (
      <div style={{ marginBottom: 8 }}>
        <ToolCallCard toolName={tc.toolName} args={tc.args} />
      </div>
    )
  }

  if (message.type === 'tool_result') {
    const tr = message as ToolResultMessage
    return (
      <div style={{ marginBottom: 8 }}>
        <ToolResultCard toolName={tr.toolName} result={tr.result} success={tr.success} />
      </div>
    )
  }

  if (message.type === 'error') {
    const err = message as ErrorMessage
    return (
      <div
        style={{
          background: '#fef0f0',
          border: '1px solid #ffcccc',
          borderRadius: 8,
          padding: '8px 12px',
          color: '#c62828',
          fontSize: 14,
        }}
      >
        {err.content}
      </div>
    )
  }

  if (message.type === 'text') {
    const tm = message as TextMessage
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            background: isUser ? '#007AFF' : '#f0f0f0',
            color: isUser ? '#fff' : '#333',
            borderRadius: 12,
            padding: '8px 14px',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {isAssistant ? <ReactMarkdown>{tm.content}</ReactMarkdown> : tm.content}
        </div>
      </div>
    )
  }

  return null
}