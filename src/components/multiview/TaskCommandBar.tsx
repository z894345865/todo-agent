import { useEffect, useRef } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition, ViewType } from '../../tasks/types.ts'

interface TaskCommandBarProps {
  view: ViewDefinition
  onOpenFields: () => void
  onOpenFilters: () => void
  onOpenGroup: () => void
  onOpenSort: () => void
}

const SEARCH_SAVE_DELAY_MS = 350

const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  grid: '表格',
  kanban: '看板',
  calendar: '日历',
}

export function TaskCommandBar({ view, onOpenFields, onOpenFilters, onOpenGroup, onOpenSort }: TaskCommandBarProps) {
  const createTask = useTaskStore((state) => state.createTask)
  const setViewSearchQuery = useTaskStore((state) => state.setViewSearchQuery)
  const updateView = useTaskStore((state) => state.updateView)
  const saveTimer = useRef<number | undefined>()
  const pendingSave = useRef<{ query: string; viewId: string } | undefined>()
  const query = view.searchQuery ?? ''

  useEffect(() => {
    const viewId = view.id
    return () => flushSearchSave(viewId)
  }, [view.id])

  useEffect(() => () => flushSearchSave(), [])

  const flushSearchSave = (viewId?: string) => {
    if (saveTimer.current !== undefined) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = undefined
    }

    const pending = pendingSave.current
    if (!pending || (viewId && pending.viewId !== viewId)) {
      return
    }
    pendingSave.current = undefined

    const latestView = useTaskStore.getState().views.find((item) => item.id === pending.viewId)
    if (!latestView) {
      return
    }
    void updateView({ ...latestView, searchQuery: pending.query }).catch(console.error)
  }

  const saveSearchQuery = (nextQuery: string) => {
    setViewSearchQuery(view.id, nextQuery)
    pendingSave.current = { query: nextQuery, viewId: view.id }
    if (saveTimer.current !== undefined) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      flushSearchSave()
    }, SEARCH_SAVE_DELAY_MS)
  }

  return (
    <div className="task-command-bar">
      <div className="task-command-bar__view">
        <strong>{view.name}</strong>
        <span>{VIEW_TYPE_LABELS[view.type]}</span>
      </div>
      <label className="task-command-bar__search">
        <span aria-hidden="true">Search</span>
        <input aria-label="搜索记录" placeholder="搜索记录..." value={query} onChange={(event) => saveSearchQuery(event.target.value)} />
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
