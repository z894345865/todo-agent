import { useEffect, useState } from 'react'
import { getFieldLabel } from '../../tasks/displayLabels.ts'
import { setGroupBy } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateView: (viewId: string, updater: (view: ViewDefinition) => ViewDefinition) => Promise<ViewDefinition>
  view: ViewDefinition
}

const GROUP_FIELD_IDS = ['none', 'status', 'priority', 'tagIds'] as const

export function TaskGroupDialog({ open, onOpenChange, onUpdateView, view }: TaskGroupDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const [fieldId, setFieldId] = useState(view.groupBy ?? 'none')

  useEffect(() => {
    if (open) {
      setFieldId(view.groupBy ?? 'none')
    }
  }, [open, view.groupBy])

  if (!open) {
    return null
  }

  const apply = () => {
    void onUpdateView(view.id, (latestView) => setGroupBy(latestView, fieldId === 'none' ? undefined : fieldId))
      .then(() => onOpenChange(false))
      .catch(console.error)
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="分组" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>分组</h2>
          <button aria-label="关闭" type="button" onClick={() => onOpenChange(false)}>
            x
          </button>
        </header>
        <label>
          <span>分组字段</span>
          <select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
            {GROUP_FIELD_IDS.map((id) => (
              <option key={id} value={id}>
                {id === 'none' ? '不分组' : getFieldLabel(fields.find((field) => field.id === id) ?? id)}
              </option>
            ))}
          </select>
        </label>
        <footer>
          <button type="button" onClick={() => void onUpdateView(view.id, (latestView) => setGroupBy(latestView, undefined)).then(() => onOpenChange(false)).catch(console.error)}>
            清除
          </button>
          <button type="button" onClick={apply}>
            应用分组
          </button>
        </footer>
      </section>
    </div>
  )
}
