import type { FieldDefinition, FieldOption, TaskPriority, TaskStatus, ViewDefinition } from './types.ts'

export const STATUS_OPTIONS: FieldOption[] = [
  { id: 'todo', name: 'Todo', color: '#64748b' },
  { id: 'doing', name: 'Doing', color: '#2563eb' },
  { id: 'done', name: 'Done', color: '#16a34a' },
  { id: 'blocked', name: 'Blocked', color: '#dc2626' },
]

export const PRIORITY_OPTIONS: FieldOption[] = [
  { id: 'urgent', name: 'Urgent', color: '#dc2626' },
  { id: 'high', name: 'High', color: '#ea580c' },
  { id: 'medium', name: 'Medium', color: '#ca8a04' },
  { id: 'low', name: 'Low', color: '#16a34a' },
]

export const DEFAULT_STATUS: TaskStatus = 'todo'
export const DEFAULT_PRIORITY: TaskPriority = 'medium'
export const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'title', name: 'Task', type: 'text', required: true },
  { id: 'status', name: 'Status', type: 'singleSelect', required: true, options: STATUS_OPTIONS },
  { id: 'priority', name: 'Priority', type: 'singleSelect', required: true, options: PRIORITY_OPTIONS },
  { id: 'tagIds', name: 'Tags', type: 'multiSelect' },
  { id: 'dueDate', name: 'Due date', type: 'date' },
  { id: 'completedAt', name: 'Completed date', type: 'date', readOnly: true },
  { id: 'description', name: 'Description', type: 'longText' },
  { id: 'createdAt', name: 'Created time', type: 'date', readOnly: true },
]

export const DEFAULT_VIEWS: ViewDefinition[] = [
  {
    id: 'grid-default',
    name: 'Grid',
    type: 'grid',
    visibleFieldIds: ['title', 'status', 'priority', 'tagIds', 'dueDate', 'description', 'createdAt'],
    filters: [],
    sorts: [{ fieldId: 'createdAt', direction: 'desc' }],
    columnWidths: { title: 260, status: 120, priority: 100, tagIds: 180, dueDate: 120, description: 260, createdAt: 140 },
  },
  {
    id: 'kanban-status',
    name: 'Kanban',
    type: 'kanban',
    visibleFieldIds: ['title', 'priority', 'tagIds', 'dueDate'],
    filters: [],
    sorts: [{ fieldId: 'priority', direction: 'asc' }],
    groupBy: 'status',
  },
  {
    id: 'calendar-due-date',
    name: 'Calendar',
    type: 'calendar',
    visibleFieldIds: ['title', 'status', 'priority', 'tagIds', 'dueDate'],
    filters: [],
    sorts: [{ fieldId: 'dueDate', direction: 'asc' }],
  },
]
