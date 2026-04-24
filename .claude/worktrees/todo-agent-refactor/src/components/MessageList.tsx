import { useEffect, useRef } from 'react'
import type { Message } from '../types'
import { Message as MessageComponent } from './Message'

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: 14,
        }}
      >
        发送消息开始对话
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
      {messages.map((msg) => (
        <MessageComponent key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
