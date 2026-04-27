import type { EditableGridCell, GridCell, Item } from '@glideapps/glide-data-grid'
import { GridCellKind } from '@glideapps/glide-data-grid'
import type { FieldDefinition, Tag, Task, TaskPriority, TaskStatus } from '../../tasks/types.ts'

type TaskUpdates = Partial<Omit<Task, 'id' | 'createdAt'>>

const STATUS_VALUES: TaskStatus[] = ['todo', 'doing', 'done', 'blocked']
const PRIORITY_VALUES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

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
    case 'status':
      return isTaskStatus(value) ? { status: value } : {}
    case 'priority':
      return isTaskPriority(value) ? { priority: value } : {}
    case 'tagIds':
      return { tagIds: parseTagIds(value, tags) }
    case 'dueDate':
      return { dueDate: normalizeOptionalString(value) }
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
    case 'status':
    case 'priority':
    case 'id':
      return task[field.id]
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

  return values.map((item) => tags.find((tag) => tag.id === item || tag.name === item)?.id ?? item)
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

function isTaskStatus(value: string): value is TaskStatus {
  return STATUS_VALUES.includes(value as TaskStatus)
}

function isTaskPriority(value: string): value is TaskPriority {
  return PRIORITY_VALUES.includes(value as TaskPriority)
}
