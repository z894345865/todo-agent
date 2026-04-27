import { useTaskStore } from '../../tasks/store.ts'

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const setActiveView = useTaskStore((state) => state.setActiveView)
  const createTask = useTaskStore((state) => state.createTask)

  return (
    <div className="task-toolbar">
      <div className="task-toolbar__views" aria-label="视图切换">
        {views.map((view) => (
          <button
            className={`task-toolbar__view-button${view.id === activeViewId ? ' is-active' : ''}`}
            key={view.id}
            onClick={() => void setActiveView(view.id).catch(console.error)}
            type="button"
          >
            {view.name}
          </button>
        ))}
      </div>
      <button className="task-toolbar__create-button" onClick={() => void createTask({ title: '新任务' }).catch(console.error)} type="button">
        新建任务
      </button>
    </div>
  )
}
