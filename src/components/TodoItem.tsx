import { useState, useEffect } from 'react'
import { TagBadge } from './TagBadge'
import { useTodoStore } from '../store'
import { getTodoTags, getTagsByIds } from '../db'
import type { Tag } from '../types'
import type { Todo } from '../types'

interface Props {
  todo: Todo
}

export function TodoItem({ todo }: Props) {
  const [tags, setTags] = useState<Tag[]>([])
  const complete = useTodoStore((s) => s.complete)
  const uncomplete = useTodoStore((s) => s.uncomplete)
  const deleteTodo = useTodoStore((s) => s.delete)

  useEffect(() => {
    const load = async () => {
      const tagIds = await getTodoTags(todo.id)
      const t = await getTagsByIds(tagIds)
      setTags(t)
    }
    load()
  }, [todo.id])

  const { priority, dueDate, description, completedAt } = todo
  const isOverdue = !todo.completed && !!(dueDate && dueDate < Date.now())

  const handleToggle = async () => {
    if (todo.completed) {
      await uncomplete(todo.id)
    } else {
      await complete(todo.id)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid #eee',
      }}
    >
      <input type="checkbox" checked={todo.completed} onChange={handleToggle} />
      <span
        style={{
          flex: 1,
          textDecoration: todo.completed ? 'line-through' : 'none',
          color: todo.completed ? '#999' : '#333',
        }}
      >
        {priority && (
          <span style={{
            display: 'inline-block',
            width: 8, height: 8, borderRadius: '50%',
            background: priority === 'high' ? '#EF4444' : priority === 'medium' ? '#EAB308' : '#22C55E',
            marginRight: 6, verticalAlign: 'middle'
          }} />
        )}
        {todo.text}
        {tags.map(tag => (
          <TagBadge key={tag.id} name={tag.name} color={tag.color} />
        ))}
        {dueDate && (
          <span style={{ fontSize: 11, color: isOverdue ? '#EF4444' : '#888', marginLeft: 6 }}>
            {isOverdue ? '⚠ ' : ''}{new Date(dueDate).toLocaleDateString('zh-CN')}
          </span>
        )}
        {description && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 2, marginLeft: 20 }}>{description}</div>
        )}
        {completedAt && (
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>完成于 {new Date(completedAt).toLocaleDateString('zh-CN')}</div>
        )}
      </span>
      <button
        onClick={() => deleteTodo(todo.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#e00',
          cursor: 'pointer',
          fontSize: 18,
        }}
      >
        ×
      </button>
    </div>
  )
}