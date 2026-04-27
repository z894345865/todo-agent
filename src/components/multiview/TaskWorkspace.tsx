import { TaskDetailPanel } from './TaskDetailPanel.tsx'
import { TaskCalendarView } from './TaskCalendarView.tsx'
import { TaskGridView } from './TaskGridView.tsx'
import { TaskKanbanView } from './TaskKanbanView.tsx'
import { TaskToolbar } from './TaskToolbar.tsx'
import { useTaskStore } from '../../tasks/store.ts'

const PLACEHOLDER_BY_TYPE = {
  grid: '表格视图加载中',
  kanban: '看板视图加载中',
  calendar: '日历视图加载中',
} as const

export function TaskWorkspace() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const error = useTaskStore((state) => state.error)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const placeholder = activeView ? PLACEHOLDER_BY_TYPE[activeView.type] : '表格视图加载中'

  return (
    <main className="task-workspace">
      <section className="task-workspace__main" aria-label="任务工作区">
        <TaskToolbar />
        {error && <div className="task-workspace__error">{error}</div>}
        <div className="task-workspace__view-shell">
          {activeView?.type === 'grid' && <TaskGridView view={activeView} />}
          {activeView?.type === 'kanban' && <TaskKanbanView view={activeView} />}
          {activeView?.type === 'calendar' && <TaskCalendarView view={activeView} />}
          {!activeView && <div className="task-workspace__placeholder">{placeholder}</div>}
        </div>
      </section>
      <TaskDetailPanel />
    </main>
  )
}
