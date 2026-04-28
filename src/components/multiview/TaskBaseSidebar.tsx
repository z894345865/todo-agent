import { getViewLabel, getViewTypeLabel } from '../../tasks/displayLabels.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewType } from '../../tasks/types.ts'

const VIEW_ICON_BY_TYPE: Record<ViewType, string> = {
  grid: '表',
  kanban: '板',
  calendar: '日',
}

export function TaskBaseSidebar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const tasks = useTaskStore((state) => state.tasks)
  const fields = useTaskStore((state) => state.fields)
  const getPreparedTasks = useTaskStore((state) => state.getPreparedTasks)
  const setActiveView = useTaskStore((state) => state.setActiveView)

  return (
    <aside className="task-base-sidebar" aria-label="任务库导航">
      <div className="task-base-sidebar__brand">
        <span className="task-base-sidebar__workspace">本地库</span>
        <strong>TODO 任务库</strong>
      </div>

      <div className="task-base-sidebar__table">
        <span className="task-base-sidebar__table-mark" aria-hidden="true" />
        <div>
          <strong>任务</strong>
          <span>
            {tasks.length} 条记录 | {fields.length} 个字段 | {views.length} 个视图
          </span>
        </div>
      </div>

      <div className="task-base-sidebar__section-title">视图</div>
      <nav className="task-base-sidebar__views" aria-label="任务视图">
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
                <strong>{getViewLabel(view)}</strong>
                <small>
                  {getViewTypeLabel(view.type)} | {filteredCount} 条记录 | {view.visibleFieldIds.length} 个字段
                </small>
              </span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
