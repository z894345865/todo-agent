import { useEffect, useMemo, useState } from 'react'
import { addFilterRule, clearFilterRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { FieldDefinition, FieldOption, FieldType, FilterRule, ViewDefinition } from '../../tasks/types.ts'

interface TaskFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateView: (viewId: string, updater: (view: ViewDefinition) => ViewDefinition) => Promise<ViewDefinition>
  view: ViewDefinition
}

const FILTER_FIELD_IDS = ['status', 'priority', 'tagIds', 'title', 'dueDate'] as const
const DEFAULT_FIELD_ID = 'status'

const OPERATOR_LABELS: Record<FilterRule['operator'], string> = {
  is: '等于',
  isNot: '不等于',
  contains: '包含',
  isEmpty: '为空',
  isNotEmpty: '不为空',
  before: '早于',
  after: '晚于',
  between: '介于',
}

const OPERATORS_BY_TYPE: Record<FieldType, FilterRule['operator'][]> = {
  text: ['contains', 'is', 'isNot', 'isEmpty', 'isNotEmpty'],
  longText: ['contains', 'isEmpty', 'isNotEmpty'],
  checkbox: ['is', 'isNot'],
  singleSelect: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
  multiSelect: ['contains', 'isEmpty', 'isNotEmpty'],
  date: ['is', 'before', 'after', 'between', 'isEmpty', 'isNotEmpty'],
}

export function TaskFilterDialog({ open, onOpenChange, onUpdateView, view }: TaskFilterDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const tags = useTaskStore((state) => state.tags)
  const filterFields = useMemo(() => FILTER_FIELD_IDS.map((id) => fields.find((field) => field.id === id)).filter(isFieldDefinition), [fields])
  const [fieldId, setFieldId] = useState(DEFAULT_FIELD_ID)
  const selectedField = filterFields.find((field) => field.id === fieldId) ?? filterFields[0]
  const operators = selectedField ? OPERATORS_BY_TYPE[selectedField.type] : OPERATORS_BY_TYPE.singleSelect
  const [operator, setOperator] = useState<FilterRule['operator']>('is')
  const [value, setValue] = useState('')
  const valueOptions = useMemo(() => getValueOptions(selectedField, tags), [selectedField, tags])
  const valueNotNeeded = operator === 'isEmpty' || operator === 'isNotEmpty'

  useEffect(() => {
    if (!open || !selectedField) {
      return
    }

    const current = view.filters.find((filter) => filter.fieldId === selectedField.id)
    const nextOperator = current?.operator && operators.includes(current.operator) ? current.operator : operators[0]
    setOperator(nextOperator)
    setValue(formatFilterValue(current?.value, selectedField.type, valueOptions))
  }, [open, operators, selectedField, valueOptions, view.filters])

  useEffect(() => {
    if (!operators.includes(operator)) {
      setOperator(operators[0])
    }
  }, [operator, operators])

  if (!open || !selectedField) {
    return null
  }

  const apply = () => {
    const rule = createFilterRule(fieldId, operator, value, selectedField.type)
    void onUpdateView(view.id, (latestView) => addFilterRule(clearFilterRule(latestView, fieldId, operator), rule))
      .then(() => onOpenChange(false))
      .catch(console.error)
  }

  const clearSelected = () => {
    void onUpdateView(view.id, (latestView) => clearFilterRule(latestView, fieldId))
      .then(() => onOpenChange(false))
      .catch(console.error)
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="筛选" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>筛选</h2>
          <button aria-label="关闭" type="button" onClick={() => onOpenChange(false)}>
            x
          </button>
        </header>
        <label>
          <span>字段</span>
          <select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
            {filterFields.map((field) => (
              <option key={String(field.id)} value={String(field.id)}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>条件</span>
          <select value={operator} onChange={(event) => setOperator(event.target.value as FilterRule['operator'])}>
            {operators.map((item) => (
              <option key={item} value={item}>
                {OPERATOR_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        {!valueNotNeeded && (
          <label>
            <span>值</span>
            {valueOptions.length > 0 && operator !== 'between' ? (
              <select value={value} onChange={(event) => setValue(event.target.value)}>
                <option value="">请选择</option>
                {valueOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={value}
                type={selectedField.type === 'date' && operator !== 'between' ? 'date' : 'text'}
                onChange={(event) => setValue(event.target.value)}
                placeholder={operator === 'between' ? '2026-04-01, 2026-04-30' : '输入筛选值'}
              />
            )}
          </label>
        )}
        <footer>
          <button type="button" onClick={clearSelected}>
            清除此字段
          </button>
          <button type="button" onClick={apply}>
            应用筛选
          </button>
        </footer>
      </section>
    </div>
  )
}

function createFilterRule(fieldId: string, operator: FilterRule['operator'], value: string, fieldType: FieldType): FilterRule {
  if (operator === 'isEmpty' || operator === 'isNotEmpty') {
    return { fieldId, operator }
  }
  if (operator === 'between') {
    return { fieldId, operator, value: value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 2) }
  }
  if (fieldType === 'checkbox') {
    return { fieldId, operator, value: value === 'true' }
  }
  return { fieldId, operator, value }
}

function formatFilterValue(value: unknown, fieldType: FieldType, options: FieldOption[]): string {
  if (Array.isArray(value)) {
    return value.join(', ')
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }
  if (typeof value === 'string') {
    return value
  }
  return options[0]?.id ?? (fieldType === 'date' ? new Date().toISOString().slice(0, 10) : '')
}

function getValueOptions(field: FieldDefinition | undefined, tags: { id: string; name: string }[]): FieldOption[] {
  if (!field) {
    return []
  }
  if (field.id === 'tagIds') {
    return tags.map((tag) => ({ id: tag.id, name: tag.name }))
  }
  return field.options ?? []
}

function isFieldDefinition(field: FieldDefinition | undefined): field is FieldDefinition {
  return Boolean(field)
}
