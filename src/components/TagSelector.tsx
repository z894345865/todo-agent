import { useState, useRef, useEffect } from 'react'
import { useTodoStore } from '../store'
import { TAG_COLORS } from '../db'
import { TagBadge } from './TagBadge'
import type { Tag } from '../types'

interface TagSelectorProps {
  selected: Tag[]
  onChange: (tags: Tag[]) => void
}

export function TagSelector({ selected, onChange }: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const tags = useTodoStore((s) => s.tags)
  const addTag = useTodoStore((s) => s.addTag)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setCreating(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = (tag: Tag) => {
    if (selected.find((t) => t.id === tag.id)) {
      onChange([])
    } else {
      onChange([tag])
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
    const tag = await addTag(newName.trim(), color)
    onChange([tag])
    setNewName('')
    setCreating(false)
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          minHeight: 34,
          border: '1px solid #ddd',
          borderRadius: 8,
          padding: '4px 8px',
          cursor: 'pointer',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          alignItems: 'center',
          fontSize: 13,
          color: selected.length === 0 ? '#aaa' : 'inherit',
        }}
      >
        {selected.length === 0 ? '选择标签' : null}
        {selected.map((t) => (
          <TagBadge
            key={t.id}
            name={t.name}
            color={t.color}
            onRemove={() => toggle(t)}
          />
        ))}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            border: '1px solid #eee',
            borderRadius: 8,
            background: '#fff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {tags.map((tag) => (
            <div
              key={tag.id}
              onClick={() => toggle(tag)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: selected.find((t) => t.id === tag.id) ? '#f5f5f5' : 'transparent',
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: tag.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 13 }}>{tag.name}</span>
              {selected.find((t) => t.id === tag.id) && (
                <span style={{ marginLeft: 'auto', color: '#22C55E' }}>✓</span>
              )}
            </div>
          ))}

          {creating ? (
            <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="标签名"
                autoFocus
                style={{
                  flex: 1,
                  padding: '4px 8px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 13,
                }}
              />
              <button onClick={handleCreate} style={{ padding: '4px 8px', cursor: 'pointer' }}>
                ✓
              </button>
            </div>
          ) : (
            <div
              onClick={() => setCreating(true)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                color: '#007AFF',
                fontSize: 13,
                borderTop: '1px solid #eee',
              }}
            >
              + 创建新标签
            </div>
          )}
        </div>
      )}
    </div>
  )
}
