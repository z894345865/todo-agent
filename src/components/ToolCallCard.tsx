import { useState } from 'react'

interface ToolCallCardProps {
  toolName: string
  args: Record<string, unknown>
}

export function ToolCallCard({ toolName, args }: ToolCallCardProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div
      style={{
        background: '#f5f5f5',
        border: '1px solid #e0e0e0',
        borderRadius: 6,
        padding: '6px 10px',
        marginTop: 6,
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span style={{ color: '#888' }}>{collapsed ? '▶' : '▼'}</span>
        <span style={{ color: '#0066cc', fontWeight: 500 }}>Tool: {toolName}</span>
      </div>
      {!collapsed && (
        <pre
          style={{
            margin: '6px 0 0',
            padding: 0,
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(args, null, 2)}
        </pre>
      )}
    </div>
  )
}