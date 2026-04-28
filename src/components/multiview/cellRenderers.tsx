import type { EditableGridCell, GridCell, Item } from '@glideapps/glide-data-grid'
import { GridCellKind } from '@glideapps/glide-data-grid'
import { PRIORITY_LABELS, STATUS_LABELS, parseTaskPriorityLabel, parseTaskStatusLabel } from '../../tasks/displayLabels.ts'
import type { FieldDefinition, Tag, Task } from '../../tasks/types.ts'

type TaskUpdates = Partial<Omit<Task, 'id' | 'createdAt'>>

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

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
      return task.tagIds.map((tagId) => tags.find((tag) => tag.id === tagId)?.name ?? tagId).join(', ')
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
  const values = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return values.flatMap((item) => {
    const tag = tags.find((candidate) => candidate.id === item || candidate.name === item)
    return tag ? [tag.id] : []
  })
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
