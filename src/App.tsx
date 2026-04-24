import { useEffect } from 'react'
import { useTodoStore } from './store'
import { StatsPanel } from './components/StatsPanel'
import { TodoInput } from './components/TodoInput'
import { TodoList } from './components/TodoList'
import { ChatContainer } from './components/ChatContainer'

export default function App() {
  const init = useTodoStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>TODO with Agent</h1>
      <StatsPanel />
      <TodoInput />
      <TodoList />
      <ChatContainer />
    </div>
  )
}
