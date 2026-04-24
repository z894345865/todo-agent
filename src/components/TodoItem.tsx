import { useTodoStore } from '../store'
import type { Todo } from '../types'

interface Props {
  todo: Todo
}

export function TodoItem({ todo }: Props) {
  const complete = useTodoStore((s) => s.complete)
  const uncomplete = useTodoStore((s) => s.uncomplete)
  const deleteTodo = useTodoStore((s) => s.delete)

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
        {todo.text}
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