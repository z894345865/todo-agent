import { DEFAULT_VIEWS } from '../../tasks/defaults.ts'
import { resetColumnWidths, setVisibleField } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskFieldConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

export function TaskFieldConfigDialog({ open, onOpenChange, view }: TaskFieldConfigDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const defaultView = DEFAULT_VIEWS.find((item) => item.id === view.id) ?? DEFAULT_VIEWS.find((item) => item.type === view.type) ?? view

  if (!open) {
    return null
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="字段管理" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>字段管理</h2>
          <button aria-label="关闭" type="button" onClick={() => onOpenChange(false)}>
            ×
          </button>
        </header>
        <div className="task-field-list">
          {fields.map((field) => (
            <label key={String(field.id)} className="task-field-list__item">
              <input
                checked={view.visibleFieldIds.includes(String(field.id))}
                disabled={field.id === 'title'}
                type="checkbox"
                onChange={(event) => void updateView(setVisibleField(view, String(field.id), event.target.checked)).catch(console.error)}
              />
              <span>{field.name}</span>
              {field.id === 'title' && <small>必选</small>}
            </label>
          ))}
        </div>
        <footer>
          <button type="button" onClick={() => void updateView(resetColumnWidths(view, defaultView)).catch(console.error)}>
            重置列宽
          </button>
          <button type="button" onClick={() => onOpenChange(false)}>
            完成
          </button>
        </footer>
      </section>
    </div>
  )
}
