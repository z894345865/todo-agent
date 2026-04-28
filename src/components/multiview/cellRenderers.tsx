import type { EditableGridCell, GridCell, Item } from '@glideapps/glide-data-grid'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { PRIORITY_LABELS, STATUS_LABELS, parseTaskPriorityLabel, parseTaskStatusLabel } from '../../tasks/displayLabels.ts'
import type { FieldDefinition, Tag, Task } from '../../tasks/types.ts'
import { PRIORITY_VISUALS, STATUS_VISUALS, tagVisualToken, type VisualToken } from './taskVisuals.ts'

type TaskUpdates = Partial<Omit<Task, 'id' | 'createdAt'>>

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export interface GridPill {
  label: string
  token: VisualToken
}

export function parseItem(item: Item): { columnIndex: number; rowIndex: number } {
  const [columnIndex, rowIndex] = item
  return { columnIndex, rowIndex }
}

export function taskFieldToGridCell(task: Task, field: FieldDefinition, tags: Tag[]): GridCell {
  const displayData = getFieldDisplayValue(task, field, tags)

  return {
    kind: GridCellKind.Text,
    allowOverlay: !field.readOnly,
    readonly: field.readOnly,
    data: displayData,
    displayData,
  }
}

export function getTaskFieldPills(task: Task, field: FieldDefinition, tags: Tag[]): GridPill[] {
  switch (field.id) {
    case 'status':
      return [{ label: STATUS_LABELS[task.status], token: STATUS_VISUALS[task.status] }]
    case 'priority':
      return [{ label: PRIORITY_LABELS[task.priority], token: PRIORITY_VISUALS[task.priority] }]
    case 'tagIds':
      return tags
        .filter((tag) => task.tagIds.includes(tag.id))
        .map((tag) => ({
          label: tag.name,
          token: tagVisualToken(tag.color),
        }))
    default:
      return []
  }
}

export function cellToTaskUpdate(cell: EditableGridCell, field: FieldDefinition, tags: Tag[]): TaskUpdates {
  if (field.readOnly) {
    return {}
  }

  const value = getEditableCellValue(cell)

  switch (field.id) {
    case 'title': {
      const title = value.trim()
      return title ? { title } : {}
    }
    case 'status': {
      const status = parseTaskStatusLabel(value)
      return status ? { status } : {}
    }
    case 'priority': {
      const priority = parseTaskPriorityLabel(value)
      return priority ? { priority } : {}
    }
    case 'tagIds':
      return { tagIds: parseTagIds(value, tags) }
    case 'dueDate':
      return parseOptionalDateUpdate(value)
    case 'description':
      return { description: normalizeOptionalString(value) }
    case 'completedAt':
    case 'createdAt':
    case 'updatedAt':
    case 'id':
      return {}
    default:
      return {}
  }
}

function getFieldDisplayValue(task: Task, field: FieldDefinition, tags: Tag[]): string {
  switch (field.id) {
    case 'tagIds':
      return task.tagIds[0] ? tags.find((tag) => tag.id === task.tagIds[0])?.name ?? task.tagIds[0] : ''
    case 'dueDate':
    case 'completedAt':
    case 'description':
      return task[field.id] ?? ''
    case 'createdAt':
    case 'updatedAt':
      return formatDateTime(task[field.id])
    case 'title':
    case 'id':
      return task[field.id]
    case 'status':
      return STATUS_LABELS[task.status]
    case 'priority':
      return PRIORITY_LABELS[task.priority]
    default:
      return ''
  }
}

function getEditableCellValue(cell: EditableGridCell): string {
  switch (cell.kind) {
    case GridCellKind.Text:
    case GridCellKind.Markdown:
    case GridCellKind.Uri:
      return cell.data
    case GridCellKind.Number:
      return cell.data === undefined ? '' : String(cell.data)
    case GridCellKind.Boolean:
      return String(cell.data === true)
    case GridCellKind.Image:
    case GridCellKind.Custom:
      return cell.copyData ?? ''
  }
}

function parseTagIds(value: string, tags: Tag[]): string[] {
  const tagNameOrId = value.split(',')[0]?.trim()
  if (!tagNameOrId) {
    return []
  }

  const tag = tags.find((candidate) => candidate.id === tagNameOrId || candidate.name === tagNameOrId)
  return tag ? [tag.id] : []
}

function parseOptionalDateUpdate(value: string): TaskUpdates {
  const trimmed = value.trim()
  if (!trimmed) {
    return { dueDate: undefined }
  }

  return isDateOnly(trimmed) ? { dueDate: trimmed } : {}
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function isDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return false
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}
