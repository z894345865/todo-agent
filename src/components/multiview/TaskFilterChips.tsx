import { clearFilterRule, formatFilterChip, formatGroupChip, formatSortChip, setGroupBy, setSortRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskFilterChipsProps {
  onUpdateView: (viewId: string, updater: (view: ViewDefinition) => ViewDefinition) => Promise<ViewDefinition>
  view: ViewDefinition
}

export function TaskFilterChips({ onUpdateView, view }: TaskFilterChipsProps) {
  const fields = useTaskStore((state) => state.fields)
  const groupChip = formatGroupChip(view.groupBy, fields)
  const sortChip = view.sorts[0] ? formatSortChip(view.sorts[0], fields) : undefined
  const hasChips = view.filters.length > 0 || Boolean(sortChip) || Boolean(groupChip)

  if (!hasChips) {
    return null
  }

  return (
    <div className="task-filter-chips" aria-label="当前视图条件">
      {view.filters.map((filter) => (
        <button
          key={`${filter.fieldId}-${filter.operator}`}
          title="清除此筛选"
          type="button"
          onClick={() => void onUpdateView(view.id, (latestView) => clearFilterRule(latestView, filter.fieldId, filter.operator)).catch(console.error)}
        >
          <span>筛选: {formatFilterChip(filter, fields)}</span>
          <span aria-hidden="true">x</span>
        </button>
      ))}
      {sortChip && (
        <button title="清除排序" type="button" onClick={() => void onUpdateView(view.id, (latestView) => setSortRule(latestView, undefined)).catch(console.error)}>
          <span>排序: {sortChip}</span>
          <span aria-hidden="true">x</span>
        </button>
      )}
      {groupChip && (
        <button title="清除分组" type="button" onClick={() => void onUpdateView(view.id, (latestView) => setGroupBy(latestView, undefined)).catch(console.error)}>
          <span>{groupChip}</span>
          <span aria-hidden="true">x</span>
        </button>
      )}
    </div>
  )
}
