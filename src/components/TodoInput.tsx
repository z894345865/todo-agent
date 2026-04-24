import { useState } from 'react'
import { useTodoStore } from '../store'
import { PrioritySelector } from './PrioritySelector'
import { TagSelector } from './TagSelector'
import type { Tag, Priority } from '../types'

export function TodoInput() {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority | undefined>()
  const [dueDate, setDueDate] = useState('')
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [description, setDescription] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const add = useTodoStore((s) => s.add)

  const handleSubmit = async () => {
    if (!text.trim()) return
    const extra: any = {}
    if (priority) extra.priority = priority
    if (dueDate) extra.dueDate = new Date(dueDate).getTime()
    if (description) extra.description = description

    await add(text.trim(), extra)

    // Handle tags
    if (selectedTags.length > 0) {
      const todo = useTodoStore.getState().todos.find(t => t.text === text.trim())
      if (todo) {
        await useTodoStore.getState().setTodoTags(todo.id, selectedTags.map(t => t.id))
      }
    }

    setText('')
    setPriority(undefined)
    setDueDate('')
    setSelectedTags([])
    setDescription('')
    setShowAdvanced(false)
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ display: 'flex', gap: 8 }}>
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

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#007AFF',
          fontSize: 12,
          cursor: 'pointer',
          padding: '4px 0',
          marginBottom: 8,
        }}
      >
        {showAdvanced ? '收起' : '展开更多'}
      </button>

      {showAdvanced && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          {/* Priority */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>优先级</div>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>

          {/* Due date */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>截止日期</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>标签</div>
            <TagSelector selected={selectedTags} onChange={setSelectedTags} />
          </div>

          {/* Description */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>描述</div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
              style={{
                padding: '6px 8px',
                border: '1px solid #ddd',
                borderRadius: 6,
                fontSize: 13,
                width: '100%',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
