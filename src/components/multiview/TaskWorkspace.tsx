import { Suspense, lazy } from 'react'
import { TaskBaseSidebar } from './TaskBaseSidebar.tsx'
import { TaskDetailPanel } from './TaskDetailPanel.tsx'
import { TaskToolbar } from './TaskToolbar.tsx'
import { useTaskStore } from '../../tasks/store.ts'

const TaskGridView = lazy(() => import('./TaskGridView.tsx').then((module) => ({ default: module.TaskGridView })))
const TaskKanbanView = lazy(() => import('./TaskKanbanView.tsx').then((module) => ({ default: module.TaskKanbanView })))
const TaskCalendarView = lazy(() => import('./TaskCalendarView.tsx').then((module) => ({ default: module.TaskCalendarView })))

export function TaskWorkspace() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const error = useTaskStore((state) => state.error)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]

  return (
    <main className="task-base">
      <TaskBaseSidebar />
      <section className="task-base__main" aria-label="Task workspace">
        <TaskToolbar />
        {error && <div className="task-workspace__error">{error}</div>}
        <div className="task-base__view-shell">
          <Suspense fallback={<div className="task-base__loading">Loading view...</div>}>
            {activeView?.type === 'grid' && <TaskGridView view={activeView} />}
            {activeView?.type === 'kanban' && <TaskKanbanView view={activeView} />}
            {activeView?.type === 'calendar' && <TaskCalendarView view={activeView} />}
            {!activeView && <div className="task-base__loading">No view selected</div>}
          </Suspense>
        </div>
      </section>
      <TaskDetailPanel />
    </main>
  )
}
