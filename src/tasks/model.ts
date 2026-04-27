import { DEFAULT_PRIORITY, DEFAULT_STATUS } from './defaults.ts'
import type { FilterRule, SortRule, Task, TaskPriority, TaskStatus, TaskSummary } from './types.ts'

const VALID_STATUSES: TaskStatus[] = ['todo', 'doing', 'done', 'blocked']
const VALID_PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

type TaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & {
  id?: string
  title: string
  createdAt?: string
  updatedAt?: string
}

type TaskUpdates = Partial<Omit<Task, 'id' | 'createdAt'>>

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }

  if (typeof value === 'string') {
    if (DATE_ONLY_PATTERN.test(value)) {
      assertValidDateOnly(value, 'date')
      return value
    }

    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
  }

  throw new Error('date must be YYYY-MM-DD')
}

export function createTask(input: TaskInput, now: Date | string = new Date()): Task {
  const timestamp = toTimestamp(now)
  return normalizeTask({
    ...input,
    id: input.id ?? randomId(),
    status: input.status ?? DEFAULT_STATUS,
    priority: input.priority ?? DEFAULT_PRIORITY,
    tagIds: input.tagIds ?? [],
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp,
    completedAt: input.status === 'done' ? input.completedAt ?? toDateOnly(now) : input.completedAt,
  })
}

export function normalizeTask(value: unknown): Task {
  if (!isRecord(value)) {
    throw new Error('task must be an object')
  }

  const title = normalizeTitle(value.title)
  const status = normalizeStatus(value.status ?? DEFAULT_STATUS)
  const priority = normalizePriority(value.priority ?? DEFAULT_PRIORITY)
  const tagIds = normalizeTagIds(value.tagIds)
  const dueDate = normalizeOptionalDate(value.dueDate, 'dueDate')
  const completedAt = normalizeOptionalDate(value.completedAt, 'completedAt')
  const description = normalizeOptionalString(value.description)
  const createdAt = normalizeTimestamp(value.createdAt)
  const updatedAt = normalizeTimestamp(value.updatedAt)
  const id = normalizeId(value.id)

  return {
    id,
    title,
    status,
    priority,
    tagIds,
    ...(dueDate ? { dueDate } : {}),
    ...(description ? { description } : {}),
    createdAt,
    updatedAt,
    ...(completedAt ? { completedAt } : {}),
  }
}

export function updateTask(task: Task, updates: TaskUpdates, now: Date | string = new Date()): Task {
  const nextStatus = updates.status ?? task.status
  const nextCompletedAt = getNextCompletedAt(task, updates, nextStatus, now)

  return normalizeTask({
    ...task,
    ...updates,
    status: nextStatus,
    updatedAt: toTimestamp(now),
    completedAt: nextCompletedAt,
  })
}

export function applyFilters(tasks: Task[], filters: FilterRule[], today: Date | string = new Date()): Task[] {
  return tasks.filter((task) => filters.every((filter) => matchesFilter(task, filter, today)))
}

export function applySorts(tasks: Task[], sorts: SortRule[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .sort((left, right) => {
      for (const sort of sorts) {
        const result = compareValues(getFieldValue(left.task, sort.fieldId), getFieldValue(right.task, sort.fieldId), sort.fieldId)
        if (result !== 0) {
          return sort.direction === 'asc' ? result : -result
        }
      }

      return left.index - right.index
    })
    .map(({ task }) => task)
}

export function groupTasks(tasks: Task[], fieldId: string): Record<string, Task[]> {
  const groups: Record<string, Task[]> = {}

  for (const task of tasks) {
    const value = getFieldValue(task, fieldId)
    const keys = Array.isArray(value) ? (value.length > 0 ? value : ['none']) : [isEmptyValue(value) ? 'none' : String(value)]

    for (const key of keys) {
      groups[key] ??= []
      groups[key].push(task)
    }
  }

  return groups
}

export function getTaskSummary(tasks: Task[], today: Date | string = new Date()): TaskSummary {
  const todayDate = toDateOnly(today)
  const byStatus = createCountMap(VALID_STATUSES)
  const byPriority = createCountMap(VALID_PRIORITIES)

  let completed = 0
  let overdue = 0
  let dueToday = 0

  for (const task of tasks) {
    byStatus[task.status] += 1
    byPriority[task.priority] += 1

    if (task.status === 'done') {
      completed += 1
    }

    if (task.dueDate && task.status !== 'done') {
      if (task.dueDate < todayDate) {
        overdue += 1
      } else if (task.dueDate === todayDate) {
        dueToday += 1
      }
    }
  }

  return {
    total: tasks.length,
    active: tasks.length - completed,
    completed,
    overdue,
    dueToday,
    byStatus,
    byPriority,
  }
}

function matchesFilter(task: Task, filter: FilterRule, today: Date | string): boolean {
  const taskValue = getFieldValue(task, filter.fieldId)

  switch (filter.operator) {
    case 'is':
      return valueMatches(taskValue, filter.value)
    case 'isNot':
      return !valueMatches(taskValue, filter.value)
    case 'contains':
      return containsValue(taskValue, filter.value)
    case 'isEmpty':
      return isEmptyValue(taskValue)
    case 'isNotEmpty':
      return !isEmptyValue(taskValue)
    case 'before':
      return isBeforeDate(taskValue, filter.value, today)
    case 'after':
      return isAfterDate(taskValue, filter.value, today)
    case 'between':
      return isBetween(taskValue, filter.value, today)
  }
}

function valueMatches(taskValue: unknown, filterValue: unknown): boolean {
  if (Array.isArray(taskValue)) {
    return taskValue.some((item) => valueMatches(item, filterValue))
  }

  if (Array.isArray(filterValue)) {
    return filterValue.some((item) => valueMatches(taskValue, item))
  }

  return taskValue === filterValue
}

function containsValue(taskValue: unknown, filterValue: unknown): boolean {
  if (Array.isArray(taskValue)) {
    return taskValue.some((item) => containsValue(item, filterValue))
  }

  if (typeof taskValue === 'string' && typeof filterValue === 'string') {
    return taskValue.toLocaleLowerCase().includes(filterValue.toLocaleLowerCase())
  }

  return valueMatches(taskValue, filterValue)
}

function isBetween(taskValue: unknown, filterValue: unknown, today: Date | string): boolean {
  const [start, end] = getRange(filterValue)
  const taskDate = resolveDateValue(taskValue, today)
  const startDate = resolveDateValue(start, today)
  const endDate = resolveDateValue(end, today)
  if (!taskDate || !startDate || !endDate) {
    return false
  }

  return taskDate >= startDate && taskDate <= endDate
}

function isBeforeDate(taskValue: unknown, filterValue: unknown, today: Date | string): boolean {
  const taskDate = resolveDateValue(taskValue, today)
  const filterDate = resolveDateValue(filterValue, today)
  if (!taskDate || !filterDate) {
    return false
  }

  return taskDate < filterDate
}

function isAfterDate(taskValue: unknown, filterValue: unknown, today: Date | string): boolean {
  const taskDate = resolveDateValue(taskValue, today)
  const filterDate = resolveDateValue(filterValue, today)
  if (!taskDate || !filterDate) {
    return false
  }

  return taskDate > filterDate
}

function resolveDateValue(value: unknown, today: Date | string): string | undefined {
  if (value === 'today') {
    return toDateOnly(today)
  }

  if (value === undefined || value === null || value === '') {
    return undefined
  }

  try {
    return toDateOnly(value)
  } catch {
    return undefined
  }
}

function getRange(value: unknown): [unknown, unknown] {
  if (Array.isArray(value)) {
    return [value[0], value[1]]
  }

  if (isRecord(value)) {
    return [value.from ?? value.start, value.to ?? value.end]
  }

  return [undefined, undefined]
}

function compareValues(left: unknown, right: unknown, fieldId: string): number {
  if (fieldId === 'priority') {
    return prioritySortValue(left) - prioritySortValue(right)
  }

  const leftEmpty = isEmptyValue(left)
  const rightEmpty = isEmptyValue(right)
  if (leftEmpty || rightEmpty) {
    return leftEmpty === rightEmpty ? 0 : leftEmpty ? 1 : -1
  }

  const leftComparable = Array.isArray(left) ? left.join(',') : left
  const rightComparable = Array.isArray(right) ? right.join(',') : right

  if (typeof leftComparable === 'number' && typeof rightComparable === 'number') {
    return leftComparable - rightComparable
  }

  return String(leftComparable).localeCompare(String(rightComparable))
}

function prioritySortValue(value: unknown): number {
  return isTaskPriority(value) ? PRIORITY_RANK[value] : Number.MAX_SAFE_INTEGER
}

function getNextCompletedAt(task: Task, updates: TaskUpdates, nextStatus: TaskStatus, now: Date | string): string | undefined {
  if (updates.status === 'done' && task.status !== 'done') {
    return toDateOnly(now)
  }

  if (updates.status && updates.status !== 'done') {
    return undefined
  }

  if ('completedAt' in updates) {
    return updates.completedAt
  }

  return nextStatus === 'done' ? task.completedAt : undefined
}

function normalizeTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('title is required')
  }

  return value.trim()
}

function normalizeId(value: unknown): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }

  return randomId()
}

function normalizeStatus(value: unknown): TaskStatus {
  if (isTaskStatus(value)) {
    return value
  }

  throw new Error('status is invalid')
}

function normalizePriority(value: unknown): TaskPriority {
  if (isTaskPriority(value)) {
    return value
  }

  throw new Error('priority is invalid')
}

function normalizeTagIds(value: unknown): string[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value) || value.some((tagId) => typeof tagId !== 'string')) {
    throw new Error('tagIds must be an array of strings')
  }

  return [...value]
}

function normalizeOptionalDate(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    assertValidDateOnly(value, fieldName)
    return value
  }

  throw new Error(`${fieldName} must be YYYY-MM-DD`)
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new Error('description must be a string')
  }

  return value
}

function normalizeTimestamp(value: unknown): string {
  if (value === undefined || value === null || value === '') {
    return new Date().toISOString()
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return value
    }
  }

  throw new Error('timestamp must be a valid date')
}

function toTimestamp(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('timestamp must be a valid date')
  }

  return value
}

function assertValidDateOnly(value: string, fieldName: string): void {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${fieldName} must be YYYY-MM-DD`)
  }
}

function getFieldValue(task: Task, fieldId: string): unknown {
  return (task as unknown as Record<string, unknown>)[fieldId]
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}

function createCountMap<const T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<T, number>
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && VALID_STATUSES.includes(value as TaskStatus)
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && VALID_PRIORITIES.includes(value as TaskPriority)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function randomId(): string {
  return crypto.randomUUID()
}
