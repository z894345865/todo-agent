import { DEFAULT_FIELDS, DEFAULT_VIEWS } from './defaults.ts'
import { normalizeTask } from './model.ts'
import type {
  FieldDefinition,
  FieldOption,
  FieldType,
  FilterRule,
  SortRule,
  Tag,
  TaskAppData,
  ViewDefinition,
  ViewType,
} from './types.ts'

export type TaskDataFile = TaskAppData

const VALID_FIELD_TYPES: FieldType[] = ['text', 'checkbox', 'singleSelect', 'multiSelect', 'date', 'longText']
const VALID_VIEW_TYPES: ViewType[] = ['grid', 'kanban', 'calendar']
const VALID_FILTER_OPERATORS: FilterRule['operator'][] = [
  'is',
  'isNot',
  'contains',
  'isEmpty',
  'isNotEmpty',
  'before',
  'after',
  'between',
]
const VALID_SORT_DIRECTIONS: SortRule['direction'][] = ['asc', 'desc']

export function createEmptyTaskData(): TaskDataFile {
  return {
    version: 1,
    tasks: [],
    tags: [],
    fields: cloneFields(DEFAULT_FIELDS),
    views: cloneViews(DEFAULT_VIEWS),
    ui: {
      activeViewId: 'grid-default',
    },
  }
}

export function normalizeTaskData(value: unknown): TaskDataFile {
  if (!isRecord(value)) {
    throw new Error('task data root must be an object')
  }

  const ui = isRecord(value.ui) ? value.ui : {}
  const views = normalizeViews(value.views)

  return {
    version: 1,
    tasks: arrayField(value, 'tasks').map((task) => normalizeTask(task)),
    tags: arrayField(value, 'tags').map((tag) => normalizeTag(tag)),
    fields: normalizeFields(value.fields),
    views,
    ui: {
      activeViewId: normalizeActiveViewId(ui.activeViewId, views),
      ...(typeof ui.selectedTaskId === 'string' ? { selectedTaskId: ui.selectedTaskId } : {}),
    },
  }
}

function normalizeFields(value: unknown): FieldDefinition[] {
  if (value === undefined) {
    return cloneFields(DEFAULT_FIELDS)
  }

  if (!Array.isArray(value)) {
    throw new Error('fields must be an array')
  }

  return value.map((field) => normalizeField(field))
}

function normalizeViews(value: unknown): ViewDefinition[] {
  if (value === undefined) {
    return cloneViews(DEFAULT_VIEWS)
  }

  if (!Array.isArray(value)) {
    throw new Error('views must be an array')
  }

  return value.map((view) => normalizeView(view))
}

function normalizeTag(value: unknown): Tag {
  if (!isRecord(value)) {
    throw new Error('tag must be an object')
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('tag id is required')
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('tag name is required')
  }

  if (typeof value.color !== 'string' || value.color.trim() === '') {
    throw new Error('tag color is required')
  }

  return {
    id: value.id,
    name: value.name,
    color: value.color,
  }
}

function normalizeField(value: unknown): FieldDefinition {
  if (!isRecord(value)) {
    throw new Error('field must be an object')
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('field id is required')
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('field name is required')
  }

  const type = normalizeFieldType(value.type)

  return {
    id: value.id,
    name: value.name,
    type,
    ...(typeof value.required === 'boolean' ? { required: value.required } : {}),
    ...(value.options !== undefined ? { options: normalizeFieldOptions(value.options) } : {}),
    ...(typeof value.readOnly === 'boolean' ? { readOnly: value.readOnly } : {}),
  }
}

function normalizeView(value: unknown): ViewDefinition {
  if (!isRecord(value)) {
    throw new Error('view must be an object')
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('view id is required')
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('view name is required')
  }

  const type = normalizeViewType(value.type)

  return {
    id: value.id,
    name: value.name,
    type,
    visibleFieldIds: stringArrayField(value, 'visibleFieldIds'),
    filters: normalizeFilterRules(value.filters),
    sorts: normalizeSortRules(value.sorts),
    ...(typeof value.groupBy === 'string' ? { groupBy: value.groupBy } : {}),
    ...(value.columnWidths !== undefined ? { columnWidths: normalizeColumnWidths(value.columnWidths) } : {}),
  }
}

function normalizeFieldType(value: unknown): FieldType {
  if (isFieldType(value)) {
    return value
  }

  throw new Error(typeof value === 'string' ? 'field type is invalid' : 'field type is required')
}

function normalizeViewType(value: unknown): ViewType {
  if (isViewType(value)) {
    return value
  }

  throw new Error(typeof value === 'string' ? 'view type is invalid' : 'view type is required')
}

function normalizeFieldOptions(value: unknown): FieldOption[] {
  if (!Array.isArray(value)) {
    throw new Error('field options must be an array')
  }

  return value.map((option) => normalizeFieldOption(option))
}

function normalizeFieldOption(value: unknown): FieldOption {
  if (!isRecord(value)) {
    throw new Error('field option must be an object')
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    throw new Error('field option id is required')
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error('field option name is required')
  }

  if (value.color !== undefined && typeof value.color !== 'string') {
    throw new Error('field option color must be a string')
  }

  return {
    id: value.id,
    name: value.name,
    ...(typeof value.color === 'string' ? { color: value.color } : {}),
  }
}

function normalizeFilterRules(value: unknown): FilterRule[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error('filters must be an array')
  }

  return value.map((filter) => normalizeFilterRule(filter))
}

function normalizeFilterRule(value: unknown): FilterRule {
  if (!isRecord(value)) {
    throw new Error('filter must be an object')
  }

  if (typeof value.fieldId !== 'string' || value.fieldId.trim() === '') {
    throw new Error('filter fieldId is required')
  }

  if (!isFilterOperator(value.operator)) {
    throw new Error(typeof value.operator === 'string' ? 'filter operator is invalid' : 'filter operator is required')
  }

  return {
    fieldId: value.fieldId,
    operator: value.operator,
    ...('value' in value ? { value: cloneJsonValue(value.value) } : {}),
  }
}

function normalizeSortRules(value: unknown): SortRule[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error('sorts must be an array')
  }

  return value.map((sort) => normalizeSortRule(sort))
}

function normalizeSortRule(value: unknown): SortRule {
  if (!isRecord(value)) {
    throw new Error('sort must be an object')
  }

  if (typeof value.fieldId !== 'string' || value.fieldId.trim() === '') {
    throw new Error('sort fieldId is required')
  }

  if (!isSortDirection(value.direction)) {
    throw new Error(typeof value.direction === 'string' ? 'sort direction is invalid' : 'sort direction is required')
  }

  return {
    fieldId: value.fieldId,
    direction: value.direction,
  }
}

function normalizeActiveViewId(value: unknown, views: ViewDefinition[]): string {
  const fallbackView = views.find((view) => view.id === 'grid-default') ?? views[0]
  const fallbackId = fallbackView?.id ?? 'grid-default'

  if (typeof value !== 'string' || value.trim() === '') {
    return fallbackId
  }

  return views.some((view) => view.id === value) ? value : fallbackId
}

function arrayField(value: Record<string, unknown>, field: string): unknown[] {
  const fieldValue = value[field]
  if (fieldValue === undefined) return []
  if (!Array.isArray(fieldValue)) {
    throw new Error(`${field} must be an array`)
  }
  return fieldValue
}

function stringArrayField(value: Record<string, unknown>, field: string): string[] {
  const fieldValue = arrayField(value, field)
  if (fieldValue.some((item) => typeof item !== 'string')) {
    throw new Error(`${field} must be an array of strings`)
  }
  return [...fieldValue] as string[]
}

function normalizeColumnWidths(value: unknown): Record<string, number> {
  if (!isNumberRecord(value)) {
    throw new Error('columnWidths must be an object of numbers')
  }

  return { ...value }
}

function cloneFields(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.map((field) => ({
    ...field,
    ...(field.options ? { options: field.options.map((option) => ({ ...option })) } : {}),
  }))
}

function cloneViews(views: ViewDefinition[]): ViewDefinition[] {
  return views.map((view) => ({
    ...view,
    visibleFieldIds: [...view.visibleFieldIds],
    filters: view.filters.map((filter) => ({ ...filter })),
    sorts: view.sorts.map((sort) => ({ ...sort })),
    ...(view.columnWidths ? { columnWidths: { ...view.columnWidths } } : {}),
  }))
}

function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'number')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFieldType(value: unknown): value is FieldType {
  return typeof value === 'string' && VALID_FIELD_TYPES.includes(value as FieldType)
}

function isViewType(value: unknown): value is ViewType {
  return typeof value === 'string' && VALID_VIEW_TYPES.includes(value as ViewType)
}

function isFilterOperator(value: unknown): value is FilterRule['operator'] {
  return typeof value === 'string' && VALID_FILTER_OPERATORS.includes(value as FilterRule['operator'])
}

function isSortDirection(value: unknown): value is SortRule['direction'] {
  return typeof value === 'string' && VALID_SORT_DIRECTIONS.includes(value as SortRule['direction'])
}

function cloneJsonValue(value: unknown): unknown {
  if (value === undefined || value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonValue(item))
  }

  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneJsonValue(item)]))
  }

  throw new Error('filter value must be JSON-compatible')
}
