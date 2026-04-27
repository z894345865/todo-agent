export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type FieldType = 'text' | 'checkbox' | 'singleSelect' | 'multiSelect' | 'date' | 'longText'
export type ViewType = 'grid' | 'kanban' | 'calendar'

export interface Task {
  id: string
  title: string
  status: TaskStatus
  priority: TaskPriority
  tagIds: string[]
  dueDate?: string
  description?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface FieldOption {
  id: string
  name: string
  color?: string
}

export interface FieldDefinition {
  id: keyof Task | string
  name: string
  type: FieldType
  required?: boolean
  options?: FieldOption[]
  readOnly?: boolean
}

export interface FilterRule {
  fieldId: string
  operator: 'is' | 'isNot' | 'contains' | 'isEmpty' | 'isNotEmpty' | 'before' | 'after' | 'between'
  value?: unknown
}

export interface SortRule {
  fieldId: string
  direction: 'asc' | 'desc'
}

export interface ViewDefinition {
  id: string
  name: string
  type: ViewType
  visibleFieldIds: string[]
  filters: FilterRule[]
  sorts: SortRule[]
  groupBy?: string
  columnWidths?: Record<string, number>
}

export interface TaskAppData {
  version: 1
  tasks: Task[]
  tags: Tag[]
  fields: FieldDefinition[]
  views: ViewDefinition[]
  ui: {
    activeViewId: string
    selectedTaskId?: string
  }
}

export interface TaskSummary {
  total: number
  active: number
  completed: number
  overdue: number
  dueToday: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
}
