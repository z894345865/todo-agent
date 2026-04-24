import type { Priority } from '../types'

interface PrioritySelectorProps {
  value?: Priority
  onChange: (p: Priority | undefined) => void
}

const OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#EF4444' },
  { value: 'medium', label: '中', color: '#EAB308' },
  { value: 'low', label: '低', color: '#22C55E' },
]

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? undefined : opt.value)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: value === opt.value ? opt.color : '#ddd',
            background: value === opt.value ? opt.color + '22' : 'transparent',
            color: value === opt.value ? opt.color : '#888',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: value === opt.value ? 600 : 400,
            transition: 'all 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
