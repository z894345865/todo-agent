import { useEffect, useState } from 'react'
import { setGroupBy } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

const GROUP_FIELD_IDS = ['none', 'status', 'priority', 'tagIds'] as const

export function TaskGroupDialog({ open, onOpenChange, view }: TaskGroupDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
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
    void updateView(setGroupBy(view, fieldId === 'none' ? undefined : fieldId))
      .then(() => onOpenChange(false))
      .catch(console.error)
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="分组" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>分组</h2>
          <button aria-label="关闭" type="button" onClick={() => onOpenChange(false)}>
            ×
          </button>
        </header>
        <label>
          <span>分组字段</span>
          <select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
            {GROUP_FIELD_IDS.map((id) => (
              <option key={id} value={id}>
                {id === 'none' ? '不分组' : fields.find((field) => field.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        </label>
        <footer>
          <button type="button" onClick={() => void updateView(setGroupBy(view, undefined)).then(() => onOpenChange(false)).catch(console.error)}>
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
