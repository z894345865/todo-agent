import { useState } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition, ViewType } from '../../tasks/types.ts'

interface TaskCommandBarProps {
  view: ViewDefinition
  onOpenFields: () => void
  onOpenFilters: () => void
  onOpenGroup: () => void
  onOpenSort: () => void
}

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  grid: '表格',
  kanban: '看板',
  calendar: '日历',
}

export function TaskCommandBar({ view, onOpenFields, onOpenFilters, onOpenGroup, onOpenSort }: TaskCommandBarProps) {
  const createTask = useTaskStore((state) => state.createTask)
  const [query, setQuery] = useState('')

  return (
    <div className="task-command-bar">
      <div className="task-command-bar__view">
        <strong>{view.name}</strong>
        <span>{VIEW_TYPE_LABELS[view.type]}</span>
      </div>
      <label className="task-command-bar__search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="搜索记录" placeholder="搜索记录..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="task-command-bar__actions" aria-label={`${view.name} 操作`}>
        <button type="button" onClick={onOpenFields}>
          Fields
        </button>
        <button type="button" onClick={onOpenFilters}>
          Filter
        </button>
        <button type="button" onClick={onOpenGroup}>
          Group
        </button>
        <button type="button" onClick={onOpenSort}>
          Sort
        </button>
        <button className="task-command-bar__primary" type="button" onClick={() => void createTask({ title: '新任务' }).catch(console.error)}>
          New
        </button>
      </div>
    </div>
  )
}
