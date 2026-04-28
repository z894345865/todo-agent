import { useTaskStore } from '../../tasks/store.ts'
import type { ViewType } from '../../tasks/types.ts'

const VIEW_LABEL_BY_TYPE: Record<ViewType, string> = {
  grid: 'Grid',
  kanban: 'Kanban',
  calendar: 'Calendar',
}

const VIEW_ICON_BY_TYPE: Record<ViewType, string> = {
  grid: 'G',
  kanban: 'K',
  calendar: 'C',
}

export function TaskBaseSidebar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const tasks = useTaskStore((state) => state.tasks)
  const fields = useTaskStore((state) => state.fields)
  const getPreparedTasks = useTaskStore((state) => state.getPreparedTasks)
  const setActiveView = useTaskStore((state) => state.setActiveView)

  return (
    <aside className="task-base-sidebar" aria-label="Task base navigation">
      <div className="task-base-sidebar__brand">
        <span className="task-base-sidebar__workspace">Local base</span>
        <strong>TODO Base</strong>
      </div>

      <div className="task-base-sidebar__table">
        <span className="task-base-sidebar__table-mark" aria-hidden="true" />
        <div>
          <strong>Tasks</strong>
          <span>
            {tasks.length} records | {fields.length} fields | {views.length} views
          </span>
        </div>
      </div>

      <div className="task-base-sidebar__section-title">Views</div>
      <nav className="task-base-sidebar__views" aria-label="Task views">
        {views.map((view) => {
          const filteredCount = getPreparedTasks(view.id).length
          const isActive = view.id === activeViewId

          return (
            <button
              aria-current={isActive ? 'page' : undefined}
              className={isActive ? 'is-active' : undefined}
              key={view.id}
              onClick={() => void setActiveView(view.id).catch(console.error)}
              type="button"
            >
              <span className="task-base-sidebar__view-icon" aria-hidden="true">
                {VIEW_ICON_BY_TYPE[view.type]}
              </span>
              <span className="task-base-sidebar__view-text">
                <strong>{view.name}</strong>
                <small>
                  {VIEW_LABEL_BY_TYPE[view.type]} | {filteredCount} records | {view.visibleFieldIds.length} fields
                </small>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
