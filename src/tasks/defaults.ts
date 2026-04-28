import type { FieldDefinition, FieldOption, TaskPriority, TaskStatus, ViewDefinition } from './types.ts'
import { FIELD_LABELS, PRIORITY_LABELS, STATUS_LABELS } from './displayLabels.ts'

export const STATUS_OPTIONS: FieldOption[] = [
  { id: 'todo', name: STATUS_LABELS.todo, color: '#64748b' },
  { id: 'doing', name: STATUS_LABELS.doing, color: '#2563eb' },
  { id: 'done', name: STATUS_LABELS.done, color: '#16a34a' },
  { id: 'blocked', name: STATUS_LABELS.blocked, color: '#dc2626' },
]

export const PRIORITY_OPTIONS: FieldOption[] = [
  { id: 'urgent', name: PRIORITY_LABELS.urgent, color: '#dc2626' },
  { id: 'high', name: PRIORITY_LABELS.high, color: '#ea580c' },
  { id: 'medium', name: PRIORITY_LABELS.medium, color: '#ca8a04' },
  { id: 'low', name: PRIORITY_LABELS.low, color: '#16a34a' },
]

export const DEFAULT_STATUS: TaskStatus = 'todo'
export const DEFAULT_PRIORITY: TaskPriority = 'medium'
export const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'title', name: FIELD_LABELS.title, type: 'text', required: true },
  { id: 'status', name: FIELD_LABELS.status, type: 'singleSelect', required: true, options: STATUS_OPTIONS },
  { id: 'priority', name: FIELD_LABELS.priority, type: 'singleSelect', required: true, options: PRIORITY_OPTIONS },
  { id: 'tagIds', name: FIELD_LABELS.tagIds, type: 'multiSelect' },
  { id: 'dueDate', name: FIELD_LABELS.dueDate, type: 'date' },
  { id: 'completedAt', name: FIELD_LABELS.completedAt, type: 'date', readOnly: true },
  { id: 'description', name: FIELD_LABELS.description, type: 'longText' },
  { id: 'createdAt', name: FIELD_LABELS.createdAt, type: 'date', readOnly: true },
]

export const DEFAULT_VIEWS: ViewDefinition[] = [
  {
    id: 'grid-default',
    name: '表格',
    type: 'grid',
    visibleFieldIds: ['title', 'status', 'priority', 'tagIds', 'dueDate', 'description', 'createdAt'],
    filters: [{ fieldId: 'status', operator: 'isNot', value: 'done' }],
    sorts: [{ fieldId: 'createdAt', direction: 'desc' }],
    columnWidths: { title: 260, status: 120, priority: 100, tagIds: 180, dueDate: 120, description: 260, createdAt: 140 },
  },
  {
    id: 'kanban-status',
    name: '看板',
    type: 'kanban',
    visibleFieldIds: ['title', 'priority', 'tagIds', 'dueDate'],
    filters: [],
    sorts: [{ fieldId: 'priority', direction: 'asc' }],
    groupBy: 'status',
  },
  {
    id: 'calendar-due-date',
    name: '日历',
    type: 'calendar',
    visibleFieldIds: ['title', 'status', 'priority', 'tagIds', 'dueDate'],
    filters: [],
    sorts: [{ fieldId: 'dueDate', direction: 'asc' }],
  },
]
