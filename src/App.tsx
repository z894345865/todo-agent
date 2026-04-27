import { useEffect } from 'react'
import { ChatContainer } from './components/ChatContainer'
import { TaskWorkspace } from './components/multiview/TaskWorkspace.tsx'
import { useTaskStore } from './tasks/store.ts'

export default function App() {
  const init = useTaskStore((state) => state.init)

  useEffect(() => {
    void init()
  }, [init])

  return (
    <div className="task-app">
      <h1 className="task-app__title">TODO with Agent</h1>
      <TaskWorkspace />
      <ChatContainer />
    </div>
  )
}
