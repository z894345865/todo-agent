import { useState, useEffect } from 'react'
import { useTodoStore } from '../store'
import { getTodoTags, getTagsByIds, updateTodo } from '../db'
import { PrioritySelector } from './PrioritySelector'
import { TagSelector } from './TagSelector'
import type { Tag, Priority } from '../types'

interface TodoEditModalProps {
  todoId: string
  onClose: () => void
}

export function TodoEditModal({ todoId, onClose }: TodoEditModalProps) {
  const store = useTodoStore((s) => s)
  const todo = store.todos.find((t) => t.id === todoId)

  const [text, setText] = useState(todo?.text ?? '')
  const [priority, setPriority] = useState<Priority | undefined>(todo?.priority)
  const [dueDate, setDueDate] = useState(
    todo?.dueDate ? new Date(todo.dueDate).toISOString().split('T')[0] : ''
  )
  const [description, setDescription] = useState(todo?.description ?? '')
  const [completed, setCompleted] = useState(todo?.completed ?? false)
  const [selectedTags, setSelectedTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadTags = async () => {
      if (!todoId) return
      const tagIds = await getTodoTags(todoId)
      const tags = await getTagsByIds(tagIds)
      setSelectedTags(tags)
      setLoading(false)
    }
    loadTags()
  }, [todoId])

  if (!todo) return null

  const handleSave = async () => {
    if (!text.trim()) return
    const currentTodo = store.todos.find((t) => t.id === todoId)
    if (!currentTodo) return
    const updated = {
      ...currentTodo,
      text: text.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
      description: description || undefined,
      completed,
    }
    await updateTodo(updated)
    await store.setTodoTags(todoId, selectedTags.map((t) => t.id))
    await store.init()
    onClose()
  }

  const handleDelete = async () => {
    await store.delete(todoId)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: '#fff', borderRadius: 12, width: 440, maxHeight: '80vh',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>编辑任务</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 名称 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>任务名称</div>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 优先级 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>优先级</div>
            <PrioritySelector value={priority} onChange={setPriority} />
          </div>

          {/* 截止日期 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>截止日期</div>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 标签 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>标签</div>
            {loading ? (
              <div style={{ color: '#888', fontSize: 13 }}>加载中...</div>
            ) : (
              <TagSelector selected={selectedTags} onChange={setSelectedTags} />
            )}
          </div>

          {/* 描述 */}
          <div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>描述</div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="可选"
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>

          {/* 完成状态 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} id="completed-check" />
            <label htmlFor="completed-check" style={{ fontSize: 14 }}>已完成</label>
            {todo.completedAt && (
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                完成于 {new Date(todo.completedAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
          <button
            onClick={handleDelete}
            style={{ padding: '8px 16px', background: '#fff', border: '1px solid #EF4444', borderRadius: 6, color: '#EF4444', cursor: 'pointer', fontSize: 13 }}
          >
            删除
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              style={{ padding: '8px 16px', background: '#007AFF', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
