import { useEffect } from 'react'
import { useTodoStore } from './store'
import { TodoInput } from './components/TodoInput'
import { TodoList } from './components/TodoList'
import { StatsPanel } from './components/StatsPanel'
import { AIPanel } from './components/AIPanel'

export default function App() {
  const init = useTodoStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>TODO with Agent</h1>
      <StatsPanel />
      <TodoInput />
      <TodoList />
      <AIPanel />
    </div>
  )
}
