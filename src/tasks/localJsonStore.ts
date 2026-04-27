import { DEFAULT_FIELDS, DEFAULT_VIEWS } from './defaults.ts'
import { normalizeTask } from './model.ts'
import type { FieldDefinition, Tag, TaskAppData, ViewDefinition } from './types.ts'

export type TaskDataFile = TaskAppData

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

  return {
    version: 1,
    tasks: arrayField(value, 'tasks').map((task) => normalizeTask(task)),
    tags: arrayField(value, 'tags').map((tag) => normalizeTag(tag)),
    fields: normalizeFields(value.fields),
    views: normalizeViews(value.views),
    ui: {
      activeViewId: normalizeActiveViewId(ui.activeViewId),
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

  if (typeof value.type !== 'string') {
    throw new Error('field type is required')
  }

  return {
    id: value.id,
    name: value.name,
    type: value.type as FieldDefinition['type'],
    ...(typeof value.required === 'boolean' ? { required: value.required } : {}),
    ...(Array.isArray(value.options) ? { options: value.options as FieldDefinition['options'] } : {}),
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

  if (typeof value.type !== 'string') {
    throw new Error('view type is required')
  }

  return {
    id: value.id,
    name: value.name,
    type: value.type as ViewDefinition['type'],
    visibleFieldIds: stringArrayField(value, 'visibleFieldIds'),
    filters: arrayField(value, 'filters') as ViewDefinition['filters'],
    sorts: arrayField(value, 'sorts') as ViewDefinition['sorts'],
    ...(typeof value.groupBy === 'string' ? { groupBy: value.groupBy } : {}),
    ...(isNumberRecord(value.columnWidths) ? { columnWidths: value.columnWidths } : {}),
  }
}

function normalizeActiveViewId(value: unknown): string {
  return typeof value === 'string' && value.trim() !== '' ? value : 'grid-default'
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
