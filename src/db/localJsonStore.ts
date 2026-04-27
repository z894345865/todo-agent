import type { Tag, Todo, TodoStats, TodoTag } from '../types'

export interface TodoDataFile {
  version: 1
  todos: Todo[]
  tags: Tag[]
  todoTags: TodoTag[]
  ui: {
    filters: Record<string, string>
  }
}

export function createEmptyData(): TodoDataFile {
  return {
    version: 1,
    todos: [],
    tags: [],
    todoTags: [],
    ui: { filters: {} },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function arrayField(value: Record<string, unknown>, field: string): unknown[] {
  const fieldValue = value[field]
  if (fieldValue === undefined) return []
  if (!Array.isArray(fieldValue)) {
    throw new Error(`${field} must be an array`)
  }
  return fieldValue
}

function filtersFrom(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      .map(([key, filterValue]) => [key, normalizeFilterValue(filterValue)])
  )
}

function normalizeFilterValue(value: string): string {
  if (value === '鍏ㄩ儴') return '全部'
  if (value === '全锟斤拷') return '全部'
  if (value === 'È«ï¿½ï¿½') return '全部'
  return value
}

export function normalizeData(value: unknown): TodoDataFile {
  if (!isRecord(value)) {
    throw new Error('data file root must be an object')
  }

  const ui = isRecord(value.ui) ? value.ui : {}

  return {
    version: 1,
    todos: arrayField(value, 'todos') as Todo[],
    tags: arrayField(value, 'tags') as Tag[],
    todoTags: arrayField(value, 'todoTags') as TodoTag[],
    ui: {
      filters: filtersFrom(ui.filters),
    },
  }
}

export function calculateTodoStats(todos: Todo[]): TodoStats {
  const startOfDayMs = new Date().setHours(0, 0, 0, 0)
  const startOfWeekMs = startOfDayMs - new Date(startOfDayMs).getDay() * 86400000
  const completed = todos.filter((todo) => todo.completed)
  const weeklyCompleted = completed.filter((todo) => (todo.completedAt ?? 0) >= startOfWeekMs)
  const now = Date.now()

  return {
    total: todos.length,
    completed: completed.length,
    completionRate: todos.length > 0 ? Math.round((completed.length / todos.length) * 100) : 0,
    weeklyCompleted: weeklyCompleted.length,
    priorityStats: {
      high: todos.filter((todo) => todo.priority === 'high').length,
      medium: todos.filter((todo) => todo.priority === 'medium').length,
      low: todos.filter((todo) => todo.priority === 'low').length,
    },
    overdueCount: todos.filter((todo) => !todo.completed && todo.dueDate && todo.dueDate < now).length,
  }
}
