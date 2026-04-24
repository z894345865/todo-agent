import { useEffect, useState } from 'react'
import { useTodoStore } from './store'
import { StatsPanel } from './components/StatsPanel'
import { TagManager } from './components/TagManager'
import { TodoInput } from './components/TodoInput'
import { TodoTable } from './components/TodoTable'
import { ChatContainer } from './components/ChatContainer'

export default function App() {
  const init = useTodoStore((s) => s.init)
  const [showTagManager, setShowTagManager] = useState(false)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>TODO with Agent</h1>
      <h1 style={{ marginBottom: 24, fontSize: 24 }}>TODO with Agent</h1>
      <StatsPanel />
      <button
        onClick={() => setShowTagManager(true)}
        style={{
          marginTop: 8,
          padding: '6px 12px',
          fontSize: 12,
          cursor: 'pointer',
          background: '#f5f5f5',
          border: '1px solid #ddd',
          borderRadius: 6,
        }}
      >
        管理标签
      </button>

      {showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
      <TodoInput />
      <TodoTable />
      <ChatContainer />
    </div>
  )
}
