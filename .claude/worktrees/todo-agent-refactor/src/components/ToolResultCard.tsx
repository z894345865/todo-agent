import { useState } from 'react'

interface ToolResultCardProps {
  toolName: string
  result: string
  success: boolean
}

export function ToolResultCard({ toolName, result, success }: ToolResultCardProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div
      style={{
        background: success ? '#f0f9f0' : '#fef0f0',
        border: `1px solid ${success ? '#c8e6c8' : '#ffcccc'}`,
        borderRadius: 6,
        padding: '6px 10px',
        marginTop: 4,
        fontSize: 12,
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
        onClick={() => setExpanded((c) => !c)}
      >
        <span style={{ color: '#888' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ color: success ? '#2e7d32' : '#c62828', fontWeight: 500 }}>
          Result: {toolName}
        </span>
      </div>
      {expanded && (
        <pre
          style={{
            margin: '6px 0 0',
            padding: 0,
            color: '#333',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            fontFamily: 'monospace',
          }}
        >
          {result}
        </pre>
      )}
    </div>
  )
}
