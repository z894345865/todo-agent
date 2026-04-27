import { useMemo } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { FilterRule, SortRule, TaskPriority, TaskStatus, ViewDefinition } from '../../tasks/types.ts'

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: '待办' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'blocked', label: '阻塞' },
]

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

const GROUP_OPTIONS = [
  { value: 'status', label: '状态' },
  { value: 'priority', label: '优先级' },
  { value: 'tagIds', label: '标签' },
]

const SORT_OPTIONS: Array<{ value: string; label: string; rule: SortRule }> = [
  { value: 'createdAt:desc', label: '最新创建', rule: { fieldId: 'createdAt', direction: 'desc' } },
  { value: 'dueDate:asc', label: '截止日期', rule: { fieldId: 'dueDate', direction: 'asc' } },
  { value: 'priority:asc', label: '优先级', rule: { fieldId: 'priority', direction: 'asc' } },
  { value: 'title:asc', label: '标题', rule: { fieldId: 'title', direction: 'asc' } },
]

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const fields = useTaskStore((state) => state.fields)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const setActiveView = useTaskStore((state) => state.setActiveView)
  const createTask = useTaskStore((state) => state.createTask)
  const updateView = useTaskStore((state) => state.updateView)

  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const statusFilter = getFilterValue<TaskStatus>(activeView, 'status')
  const priorityFilter = getFilterValue<TaskPriority>(activeView, 'priority')
  const sortValue = useMemo(() => {
    const firstSort = activeView?.sorts[0]
    return firstSort ? `${firstSort.fieldId}:${firstSort.direction}` : ''
  }, [activeView])

  const saveActiveView = (updater: (view: ViewDefinition) => ViewDefinition) => {
    const latestView = useTaskStore.getState().views.find((view) => view.id === activeView?.id) ?? activeView
    if (!latestView) {
      return
    }

    void updateView(updater(latestView)).catch(console.error)
  }

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

      {activeView && (
        <div className="task-toolbar__controls" aria-label="视图控制">
          <label className="task-toolbar__control">
            <span>状态</span>
            <select
              value={statusFilter ?? ''}
              onChange={(event) => saveActiveView((view) => setSingleValueFilter(view, 'status', event.target.value))}
            >
              <option value="">全部</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-toolbar__control">
            <span>优先级</span>
            <select
              value={priorityFilter ?? ''}
              onChange={(event) => saveActiveView((view) => setSingleValueFilter(view, 'priority', event.target.value))}
            >
              <option value="">全部</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-toolbar__control">
            <span>分组</span>
            <select value={activeView.groupBy ?? 'status'} onChange={(event) => saveActiveView((view) => ({ ...view, groupBy: event.target.value }))}>
              {GROUP_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="task-toolbar__control">
            <span>排序</span>
            <select
              value={SORT_OPTIONS.some((option) => option.value === sortValue) ? sortValue : ''}
              onChange={(event) => {
                const option = SORT_OPTIONS.find((item) => item.value === event.target.value)
                if (option) {
                  saveActiveView((view) => ({ ...view, sorts: [option.rule] }))
                }
              }}
            >
              <option value="" disabled>
                自定义
              </option>
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <details className="task-toolbar__fields">
            <summary>字段</summary>
            <div className="task-toolbar__field-menu">
              {fields.map((field) => (
                <label key={String(field.id)} className="task-toolbar__field-option">
                  <input
                    checked={activeView.visibleFieldIds.includes(String(field.id))}
                    disabled={field.id === 'title'}
                    type="checkbox"
                    onChange={(event) =>
                      saveActiveView((view) => ({
                        ...view,
                        visibleFieldIds: event.target.checked
                          ? addUnique(view.visibleFieldIds, String(field.id))
                          : view.visibleFieldIds.filter((fieldId) => fieldId !== field.id),
                      }))
                    }
                  />
                  <span>{field.name}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      )}

      <button className="task-toolbar__create-button" onClick={() => void createTask({ title: '新任务' }).catch(console.error)} type="button">
        新建任务
      </button>
    </div>
  )
}

function getFilterValue<T extends string>(view: ViewDefinition | undefined, fieldId: string): T | undefined {
  const filter = view?.filters.find((item) => item.fieldId === fieldId && item.operator === 'is')
  return typeof filter?.value === 'string' ? (filter.value as T) : undefined
}

function setSingleValueFilter(view: ViewDefinition, fieldId: string, value: string): ViewDefinition {
  const filters = view.filters.filter((filter) => filter.fieldId !== fieldId)
  const nextFilter: FilterRule[] = value ? [{ fieldId, operator: 'is', value }] : []
  return {
    ...view,
    filters: [...filters, ...nextFilter],
  }
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}
