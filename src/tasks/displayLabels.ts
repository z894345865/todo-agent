import type { FieldDefinition, FieldOption, TaskPriority, TaskStatus, ViewDefinition, ViewType } from './types.ts'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '待办',
  doing: '进行中',
  done: '已完成',
  blocked: '阻塞',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

export const FIELD_LABELS: Record<string, string> = {
  title: '任务',
  status: '状态',
  priority: '优先级',
  tagIds: '标签',
  dueDate: '截止日期',
  completedAt: '完成日期',
  description: '描述',
  createdAt: '创建时间',
  updatedAt: '修改时间',
}

export const VIEW_TYPE_LABELS: Record<ViewType, string> = {
  grid: '表格',
  kanban: '看板',
  calendar: '日历',
}

const DEFAULT_VIEW_LABELS: Record<string, string> = {
  'grid-default': '表格',
  'kanban-status': '看板',
  'calendar-due-date': '日历',
}

export function getFieldLabel(field: FieldDefinition | string | undefined): string {
  const fieldId = typeof field === 'string' ? field : field?.id
  return (fieldId && FIELD_LABELS[String(fieldId)]) || (typeof field === 'string' ? field : field?.name) || ''
}

export function getFieldOptionLabel(fieldId: string, value: unknown, options?: FieldOption[]): string {
  if (fieldId === 'status' && isTaskStatus(value)) {
    return STATUS_LABELS[value]
  }
  if (fieldId === 'priority' && isTaskPriority(value)) {
    return PRIORITY_LABELS[value]
  }
  if (typeof value === 'string') {
    return options?.find((option) => option.id === value)?.name ?? value
  }
  return String(value)
}

export function getViewLabel(view: ViewDefinition): string {
  return DEFAULT_VIEW_LABELS[view.id] ?? view.name
}

export function getViewTypeLabel(type: ViewType): string {
  return VIEW_TYPE_LABELS[type]
}

export function parseTaskStatusLabel(value: string): TaskStatus | undefined {
  if (isTaskStatus(value)) {
    return value
  }
  return (Object.entries(STATUS_LABELS).find(([, label]) => label === value)?.[0] as TaskStatus | undefined) ?? undefined
}

export function parseTaskPriorityLabel(value: string): TaskPriority | undefined {
  if (isTaskPriority(value)) {
    return value
  }
  return (Object.entries(PRIORITY_LABELS).find(([, label]) => label === value)?.[0] as TaskPriority | undefined) ?? undefined
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'todo' || value === 'doing' || value === 'done' || value === 'blocked'
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'urgent' || value === 'high' || value === 'medium' || value === 'low'
}
