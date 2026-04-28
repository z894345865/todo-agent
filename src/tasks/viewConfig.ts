import type { FieldDefinition, FilterRule, SortRule, ViewDefinition } from './types.ts'
import { getFieldLabel, getFieldOptionLabel } from './displayLabels.ts'

const TITLE_FIELD_ID = 'title'

export function addFilterRule(view: ViewDefinition, rule: FilterRule): ViewDefinition {
  const next = cloneView(view)
  return {
    ...next,
    filters: [...next.filters.filter((item) => !(item.fieldId === rule.fieldId && item.operator === rule.operator)), cloneFilter(rule)],
  }
}

export function clearFilterRule(view: ViewDefinition, fieldId: string, operator?: FilterRule['operator']): ViewDefinition {
  return {
    ...cloneView(view),
    filters: view.filters.filter((rule) => rule.fieldId !== fieldId || (operator !== undefined && rule.operator !== operator)).map(cloneFilter),
  }
}

export function setSortRule(view: ViewDefinition, sort: SortRule | undefined): ViewDefinition {
  return {
    ...cloneView(view),
    sorts: sort ? [{ ...sort }] : [],
  }
}

export function setGroupBy(view: ViewDefinition, fieldId: string | undefined): ViewDefinition {
  const next = cloneView(view)
  if (fieldId) {
    next.groupBy = fieldId
  } else {
    delete next.groupBy
  }
  return next
}

export function setVisibleField(view: ViewDefinition, fieldId: string, visible: boolean): ViewDefinition {
  const next = cloneView(view)
  if (fieldId === TITLE_FIELD_ID && !visible) {
    return next
  }

  if (visible) {
    next.visibleFieldIds = next.visibleFieldIds.includes(fieldId) ? next.visibleFieldIds : [...next.visibleFieldIds, fieldId]
  } else {
    next.visibleFieldIds = next.visibleFieldIds.filter((item) => item !== fieldId)
    if (!next.visibleFieldIds.includes(TITLE_FIELD_ID)) {
      next.visibleFieldIds.unshift(TITLE_FIELD_ID)
    }
  }
  return next
}

export function resetColumnWidths(view: ViewDefinition, defaultView: ViewDefinition): ViewDefinition {
  return {
    ...cloneView(view),
    columnWidths: defaultView.columnWidths ? { ...defaultView.columnWidths } : undefined,
  }
}

export function formatFilterChip(rule: FilterRule, fields: FieldDefinition[]): string {
  const field = fieldName(rule.fieldId, fields)
  const operator = operatorLabel(rule.operator)
  if (rule.value === undefined || rule.value === null || rule.value === '') {
    return `${field} ${operator}`
  }
  if (Array.isArray(rule.value)) {
    const values = rule.value.map((value) => formatRuleValue(rule.fieldId, value, fields))
    return `${field} ${operator} ${values.join(rule.operator === 'between' ? ' 到 ' : '、')}`
  }
  return `${field} ${operator} ${formatRuleValue(rule.fieldId, rule.value, fields)}`
}

export function formatSortChip(sort: SortRule, fields: FieldDefinition[]): string {
  return `${fieldName(sort.fieldId, fields)} ${sort.direction === 'asc' ? '升序' : '降序'}`
}

export function formatGroupChip(fieldId: string | undefined, fields: FieldDefinition[]): string | undefined {
  return fieldId ? `按 ${fieldName(fieldId, fields)} 分组` : undefined
}

function cloneView(view: ViewDefinition): ViewDefinition {
  return {
    ...view,
    visibleFieldIds: [...view.visibleFieldIds],
    filters: view.filters.map(cloneFilter),
    sorts: view.sorts.map((sort) => ({ ...sort })),
    ...(view.columnWidths ? { columnWidths: { ...view.columnWidths } } : {}),
  }
}

function cloneFilter(rule: FilterRule): FilterRule {
  return {
    ...rule,
    ...('value' in rule ? { value: cloneFilterValue(rule.value) } : {}),
  }
}

function cloneFilterValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneFilterValue)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneFilterValue(item)]))
  }
  return value
}

function fieldName(fieldId: string, fields: FieldDefinition[]): string {
  return getFieldLabel(fields.find((field) => field.id === fieldId) ?? fieldId)
}

function formatRuleValue(fieldId: string, value: unknown, fields: FieldDefinition[]): string {
  const options = fields.find((field) => field.id === fieldId)?.options
  return getFieldOptionLabel(fieldId, value, options)
}

function operatorLabel(operator: FilterRule['operator']): string {
  if (operator === 'is') return '等于'
  if (operator === 'isNot') return '不等于'
  if (operator === 'contains') return '包含'
  if (operator === 'isEmpty') return '为空'
  if (operator === 'isNotEmpty') return '不为空'
  if (operator === 'before') return '早于'
  if (operator === 'after') return '晚于'
  if (operator === 'between') return '介于'
  return operator
}
