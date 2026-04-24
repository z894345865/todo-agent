import { useState } from 'react'
import { useTodoStore } from '../store'
import { TodoItem } from './TodoItem'

export function TodoList() {
  const todos = useTodoStore((s) => s.todos)
  const [showCompleted, setShowCompleted] = useState(false)

  const active = todos.filter((t) => !t.completed)
  const completed = todos.filter((t) => t.completed)

  return (
    <div>
      {active.length === 0 && (
        <p style={{ color: '#999', textAlign: 'center', padding: '24px 0' }}>暂无任务</p>
      )}
      {active.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}

      {completed.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            {showCompleted ? '隐藏' : '显示'}已完成 ({completed.length})
          </button>
          {showCompleted &&
            completed.map((todo) => <TodoItem key={todo.id} todo={todo} />)}
        </div>
      )}
    </div>
  )
}