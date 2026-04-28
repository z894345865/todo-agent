import { useEffect, useState } from 'react'
import { setSortRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { SortRule, ViewDefinition } from '../../tasks/types.ts'

interface TaskSortDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateView: (viewId: string, updater: (view: ViewDefinition) => ViewDefinition) => Promise<ViewDefinition>
  view: ViewDefinition
}

export function TaskSortDialog({ open, onOpenChange, onUpdateView, view }: TaskSortDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const [fieldId, setFieldId] = useState(view.sorts[0]?.fieldId ?? 'createdAt')
  const [direction, setDirection] = useState<SortRule['direction']>(view.sorts[0]?.direction ?? 'desc')

  useEffect(() => {
    if (open) {
      setFieldId(view.sorts[0]?.fieldId ?? 'createdAt')
      setDirection(view.sorts[0]?.direction ?? 'desc')
    }
  }, [open, view.sorts])

  if (!open) {
    return null
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="排序" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>排序</h2>
          <button aria-label="关闭" type="button" onClick={() => onOpenChange(false)}>
            x
          </button>
        </header>
        <label>
          <span>字段</span>
          <select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
            {fields.map((field) => (
              <option key={String(field.id)} value={String(field.id)}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>方向</span>
          <select value={direction} onChange={(event) => setDirection(event.target.value as SortRule['direction'])}>
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
        </label>
        <footer>
          <button type="button" onClick={() => void onUpdateView(view.id, (latestView) => setSortRule(latestView, undefined)).then(() => onOpenChange(false)).catch(console.error)}>
            清除
          </button>
          <button type="button" onClick={() => void onUpdateView(view.id, (latestView) => setSortRule(latestView, { fieldId, direction })).then(() => onOpenChange(false)).catch(console.error)}>
            应用排序
          </button>
        </footer>
      </section>
    </div>
  )
}
