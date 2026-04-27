# Multiview TODO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current simple TODO UI and tools with a local, single-user multiview task workspace with grid, kanban, calendar, and rewritten agent tools.

**Architecture:** Build a new task model and store beside the existing files, then switch the app over once the model, storage, tools, and workspace UI are ready. Use `@glideapps/glide-data-grid` for the grid view, while keeping kanban, calendar, filtering, sorting, grouping, and agent tools as small local modules.

**Tech Stack:** React 18, Vite, TypeScript, Zustand, Tauri/local JSON storage, PageAgent tools, node:test, `@glideapps/glide-data-grid`, `@dnd-kit/core`, `@dnd-kit/sortable`.

---

## File Structure

Create these focused modules:

- `src/tasks/types.ts`: task, tag, field, view, filter, and sort types.
- `src/tasks/defaults.ts`: default fields, default views, option labels, and colors.
- `src/tasks/model.ts`: validation, normalization, filtering, sorting, grouping, summaries, and update helpers.
- `src/tasks/localJsonStore.ts`: versioned task app data normalization.
- `src/tasks/db.ts`: local JSON read/write CRUD functions.
- `src/tasks/store.ts`: Zustand store for tasks, tags, fields, views, and UI selection.
- `src/tasks/agentTools.ts`: new PageAgent tools that operate on the task store.
- `src/components/multiview/TaskWorkspace.tsx`: top-level multiview shell.
- `src/components/multiview/TaskToolbar.tsx`: view tabs, filter/sort/group controls, and create button.
- `src/components/multiview/TaskGridView.tsx`: Glide Data Grid view.
- `src/components/multiview/TaskKanbanView.tsx`: kanban view with drag between status columns.
- `src/components/multiview/TaskCalendarView.tsx`: month calendar plus unscheduled tasks.
- `src/components/multiview/TaskDetailPanel.tsx`: shared task detail editor.
- `src/components/multiview/cellRenderers.tsx`: field-type rendering helpers for grid cells.
- `src/components/multiview/styles.css`: workspace-specific styles.

Modify these existing files:

- `package.json`: add grid and drag dependencies if absent.
- `src/App.tsx`: initialize `useTaskStore`, render `TaskWorkspace`, and keep `ChatContainer`.
- `src/agent/tools.ts`: export the new tool registry from `src/tasks/agentTools.ts`.
- `src/agent/prompts.ts`: update tool names and task-field language.
- `src/agent/toolSchema.ts`: keep the existing zod schema conversion unless tests reveal a mismatch.
- `src/index.css`: import workspace styles if needed.

Create or update tests:

- `tests/taskModel.test.ts`
- `tests/taskLocalJsonStore.test.ts`
- `tests/taskDb.test.ts`
- `tests/taskAgentTools.test.ts`

---

### Task 1: Add Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install dependencies**

Run:

```bash
npm install @glideapps/glide-data-grid @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: `package.json` includes the four dependencies and `package-lock.json` is updated.

- [ ] **Step 2: Verify the project still builds before code changes**

Run:

```bash
npm test
```

Expected: Existing tests pass. If unrelated existing tests fail, record the failing test name before continuing.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add multiview task dependencies"
```

---

### Task 2: Define Task Types and Defaults

**Files:**
- Create: `src/tasks/types.ts`
- Create: `src/tasks/defaults.ts`
- Create: `tests/taskModel.test.ts`

- [ ] **Step 1: Write failing type/default behavior tests**

Create `tests/taskModel.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTask, getTaskSummary, groupTasks, normalizeTask } from '../src/tasks/model.ts'
import { DEFAULT_FIELDS, DEFAULT_VIEWS } from '../src/tasks/defaults.ts'
import type { Task } from '../src/tasks/types.ts'

test('default fields and views include the three required views', () => {
  assert.ok(DEFAULT_FIELDS.some((field) => field.id === 'title' && field.required))
  assert.deepEqual(DEFAULT_VIEWS.map((view) => view.type), ['grid', 'kanban', 'calendar'])
})

test('createTask creates a valid active task with timestamps', () => {
  const task = createTask({ title: 'Write plan', priority: 'high' }, '2026-04-27T12:00:00.000Z')

  assert.equal(task.title, 'Write plan')
  assert.equal(task.status, 'todo')
  assert.equal(task.priority, 'high')
  assert.deepEqual(task.tagIds, [])
  assert.equal(task.createdAt, '2026-04-27T12:00:00.000Z')
  assert.equal(task.updatedAt, '2026-04-27T12:00:00.000Z')
})

test('normalizeTask rejects empty titles and invalid dates', () => {
  assert.throws(() => normalizeTask({ id: '1', title: '   ' }), /title is required/)
  assert.throws(() => normalizeTask({ id: '1', title: 'Ship', dueDate: 'tomorrow' }), /dueDate must be YYYY-MM-DD/)
})

test('groupTasks groups by status and priority', () => {
  const tasks: Task[] = [
    createTask({ title: 'A', status: 'todo', priority: 'high' }, '2026-04-27T12:00:00.000Z'),
    createTask({ title: 'B', status: 'doing', priority: 'low' }, '2026-04-27T12:00:00.000Z'),
  ]

  assert.equal(groupTasks(tasks, 'status').todo.length, 1)
  assert.equal(groupTasks(tasks, 'priority').low.length, 1)
})

test('getTaskSummary counts active, completed, overdue, and due-today tasks', () => {
  const tasks: Task[] = [
    createTask({ title: 'Late', status: 'todo', dueDate: '2026-04-26' }, '2026-04-27T12:00:00.000Z'),
    createTask({ title: 'Today', status: 'doing', dueDate: '2026-04-27' }, '2026-04-27T12:00:00.000Z'),
    createTask({ title: 'Done', status: 'done' }, '2026-04-27T12:00:00.000Z'),
  ]

  const summary = getTaskSummary(tasks, '2026-04-27')

  assert.equal(summary.total, 3)
  assert.equal(summary.active, 2)
  assert.equal(summary.completed, 1)
  assert.equal(summary.overdue, 1)
  assert.equal(summary.dueToday, 1)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/taskModel.test.ts
```

Expected: FAIL with module-not-found errors for `src/tasks/model.ts` and `src/tasks/defaults.ts`.

- [ ] **Step 3: Implement types**

Create `src/tasks/types.ts`:

```ts
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
```

- [ ] **Step 4: Implement defaults**

Create `src/tasks/defaults.ts`:

```ts
import type { FieldDefinition, FieldOption, TaskPriority, TaskStatus, ViewDefinition } from './types.ts'

export const STATUS_OPTIONS: FieldOption[] = [
  { id: 'todo', name: '待办', color: '#64748b' },
  { id: 'doing', name: '进行中', color: '#2563eb' },
  { id: 'done', name: '已完成', color: '#16a34a' },
  { id: 'blocked', name: '阻塞', color: '#dc2626' },
]

export const PRIORITY_OPTIONS: FieldOption[] = [
  { id: 'urgent', name: '紧急', color: '#dc2626' },
  { id: 'high', name: '高', color: '#ea580c' },
  { id: 'medium', name: '中', color: '#ca8a04' },
  { id: 'low', name: '低', color: '#16a34a' },
]

export const DEFAULT_STATUS: TaskStatus = 'todo'
export const DEFAULT_PRIORITY: TaskPriority = 'medium'
export const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#ec4899', '#06b6d4']

export const DEFAULT_FIELDS: FieldDefinition[] = [
  { id: 'title', name: '任务', type: 'text', required: true },
  { id: 'status', name: '状态', type: 'singleSelect', required: true, options: STATUS_OPTIONS },
  { id: 'priority', name: '优先级', type: 'singleSelect', required: true, options: PRIORITY_OPTIONS },
  { id: 'tagIds', name: '标签', type: 'multiSelect' },
  { id: 'dueDate', name: '截止日期', type: 'date' },
  { id: 'completedAt', name: '完成日期', type: 'date', readOnly: true },
  { id: 'description', name: '描述', type: 'longText' },
  { id: 'createdAt', name: '创建时间', type: 'date', readOnly: true },
]

export const DEFAULT_VIEWS: ViewDefinition[] = [
  {
    id: 'grid-default',
    name: '表格',
    type: 'grid',
    visibleFieldIds: ['title', 'status', 'priority', 'tagIds', 'dueDate', 'description', 'createdAt'],
    filters: [],
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
```

- [ ] **Step 5: Run test and keep it failing on model functions**

Run:

```bash
npm test -- tests/taskModel.test.ts
```

Expected: FAIL with missing exports from `src/tasks/model.ts`.

---

### Task 3: Implement Task Model Helpers

**Files:**
- Create: `src/tasks/model.ts`
- Modify: `tests/taskModel.test.ts`

- [ ] **Step 1: Implement the model**

Create `src/tasks/model.ts`:

```ts
import { DEFAULT_PRIORITY, DEFAULT_STATUS } from './defaults.ts'
import type { FilterRule, SortRule, Task, TaskPriority, TaskStatus, TaskSummary } from './types.ts'

const STATUSES: TaskStatus[] = ['todo', 'doing', 'done', 'blocked']
const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low']
const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function createTask(input: Partial<Task> & { title: string }, now = new Date().toISOString()): Task {
  return normalizeTask({
    id: input.id ?? crypto.randomUUID(),
    title: input.title,
    status: input.status ?? DEFAULT_STATUS,
    priority: input.priority ?? DEFAULT_PRIORITY,
    tagIds: input.tagIds ?? [],
    dueDate: input.dueDate,
    description: input.description,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    completedAt: input.completedAt,
  })
}

export function normalizeTask(value: unknown): Task {
  if (!isRecord(value)) throw new Error('task must be an object')
  const id = stringValue(value.id, 'id')
  const title = stringValue(value.title, 'title').trim()
  if (!title) throw new Error('title is required')

  const status = (typeof value.status === 'string' ? value.status : DEFAULT_STATUS) as TaskStatus
  if (!STATUSES.includes(status)) throw new Error(`invalid status: ${status}`)

  const priority = (typeof value.priority === 'string' ? value.priority : DEFAULT_PRIORITY) as TaskPriority
  if (!PRIORITIES.includes(priority)) throw new Error(`invalid priority: ${priority}`)

  const tagIds = Array.isArray(value.tagIds) ? value.tagIds.filter((tag): tag is string => typeof tag === 'string') : []
  const dueDate = optionalDate(value.dueDate, 'dueDate')
  const completedAt = optionalDate(value.completedAt, 'completedAt')
  const description = typeof value.description === 'string' ? value.description : undefined
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString()
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt

  return { id, title, status, priority, tagIds, dueDate, description, createdAt, updatedAt, completedAt }
}

export function updateTask(task: Task, updates: Partial<Task>, now = new Date().toISOString()): Task {
  const next = normalizeTask({ ...task, ...updates, updatedAt: now })
  if (updates.status === 'done' && task.status !== 'done') {
    return { ...next, completedAt: toDateOnly(now) }
  }
  if (updates.status && updates.status !== 'done') {
    return { ...next, completedAt: undefined }
  }
  return next
}

export function applyFilters(tasks: Task[], filters: FilterRule[], today = toDateOnly(new Date().toISOString())): Task[] {
  return tasks.filter((task) => filters.every((rule) => matchesFilter(task, rule, today)))
}

export function applySorts(tasks: Task[], sorts: SortRule[]): Task[] {
  const list = [...tasks]
  list.sort((a, b) => {
    for (const sort of sorts) {
      const comparison = compareField(a, b, sort.fieldId)
      if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison
    }
    return 0
  })
  return list
}

export function groupTasks(tasks: Task[], fieldId: string): Record<string, Task[]> {
  return tasks.reduce<Record<string, Task[]>>((groups, task) => {
    const raw = task[fieldId as keyof Task]
    const keys = Array.isArray(raw) ? (raw.length > 0 ? raw : ['none']) : [raw == null || raw === '' ? 'none' : String(raw)]
    for (const key of keys) {
      groups[key] = groups[key] ?? []
      groups[key].push(task)
    }
    return groups
  }, {})
}

export function getTaskSummary(tasks: Task[], today = toDateOnly(new Date().toISOString())): TaskSummary {
  const byStatus = { todo: 0, doing: 0, done: 0, blocked: 0 }
  const byPriority = { urgent: 0, high: 0, medium: 0, low: 0 }
  for (const task of tasks) {
    byStatus[task.status] += 1
    byPriority[task.priority] += 1
  }
  return {
    total: tasks.length,
    active: tasks.filter((task) => task.status !== 'done').length,
    completed: byStatus.done,
    overdue: tasks.filter((task) => task.status !== 'done' && task.dueDate && task.dueDate < today).length,
    dueToday: tasks.filter((task) => task.status !== 'done' && task.dueDate === today).length,
    byStatus,
    byPriority,
  }
}

export function toDateOnly(value: string): string {
  return value.slice(0, 10)
}

function matchesFilter(task: Task, rule: FilterRule, today: string): boolean {
  const value = task[rule.fieldId as keyof Task]
  if (rule.operator === 'isEmpty') return value == null || value === '' || (Array.isArray(value) && value.length === 0)
  if (rule.operator === 'isNotEmpty') return !(value == null || value === '' || (Array.isArray(value) && value.length === 0))
  if (rule.operator === 'is') return Array.isArray(value) ? value.includes(String(rule.value)) : value === rule.value
  if (rule.operator === 'isNot') return Array.isArray(value) ? !value.includes(String(rule.value)) : value !== rule.value
  if (rule.operator === 'contains') return String(value ?? '').toLowerCase().includes(String(rule.value ?? '').toLowerCase())
  if (rule.operator === 'before') return typeof value === 'string' && value < String(rule.value ?? today)
  if (rule.operator === 'after') return typeof value === 'string' && value > String(rule.value ?? today)
  if (rule.operator === 'between' && Array.isArray(rule.value)) {
    return typeof value === 'string' && value >= String(rule.value[0]) && value <= String(rule.value[1])
  }
  return true
}

function compareField(a: Task, b: Task, fieldId: string): number {
  if (fieldId === 'priority') return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  const av = a[fieldId as keyof Task]
  const bv = b[fieldId as keyof Task]
  return String(av ?? '').localeCompare(String(bv ?? ''), 'zh-CN')
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value == null || value === '') return undefined
  if (typeof value !== 'string' || !DATE_RE.test(value)) throw new Error(`${field} must be YYYY-MM-DD`)
  return value
}

function stringValue(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value) throw new Error(`${field} is required`)
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```

- [ ] **Step 2: Run model tests**

Run:

```bash
npm test -- tests/taskModel.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tasks/types.ts src/tasks/defaults.ts src/tasks/model.ts tests/taskModel.test.ts
git commit -m "feat: add multiview task model"
```

---

### Task 4: Add Versioned Task Local JSON Storage

**Files:**
- Create: `src/tasks/localJsonStore.ts`
- Create: `src/tasks/db.ts`
- Create: `tests/taskLocalJsonStore.test.ts`
- Create: `tests/taskDb.test.ts`

- [ ] **Step 1: Write storage tests**

Create `tests/taskLocalJsonStore.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyTaskData, normalizeTaskData } from '../src/tasks/localJsonStore.ts'

test('createEmptyTaskData includes defaults', () => {
  const data = createEmptyTaskData()

  assert.equal(data.version, 1)
  assert.equal(data.tasks.length, 0)
  assert.ok(data.fields.some((field) => field.id === 'title'))
  assert.deepEqual(data.views.map((view) => view.type), ['grid', 'kanban', 'calendar'])
  assert.equal(data.ui.activeViewId, 'grid-default')
})

test('normalizeTaskData rejects invalid roots and keeps valid tasks', () => {
  assert.throws(() => normalizeTaskData(null), /task data root must be an object/)

  const normalized = normalizeTaskData({
    tasks: [{ id: '1', title: 'Ship', status: 'todo', priority: 'high', tagIds: [], createdAt: '2026-04-27T12:00:00.000Z', updatedAt: '2026-04-27T12:00:00.000Z' }],
  })

  assert.equal(normalized.tasks.length, 1)
  assert.equal(normalized.tags.length, 0)
  assert.equal(normalized.ui.activeViewId, 'grid-default')
})
```

Create `tests/taskDb.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { createTask } from '../src/tasks/model.ts'
import { __resetTaskDataForTests, addTaskRecord, getAllTaskRecords, updateTaskRecord, deleteTaskRecord } from '../src/tasks/db.ts'

test('task db stores, updates, and deletes records', async () => {
  await __resetTaskDataForTests()
  const task = createTask({ title: 'Persist me' }, '2026-04-27T12:00:00.000Z')

  await addTaskRecord(task)
  assert.equal((await getAllTaskRecords()).length, 1)

  await updateTaskRecord({ ...task, title: 'Persisted' })
  assert.equal((await getAllTaskRecords())[0].title, 'Persisted')

  await deleteTaskRecord(task.id)
  assert.equal((await getAllTaskRecords()).length, 0)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/taskLocalJsonStore.test.ts tests/taskDb.test.ts
```

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement local JSON normalization**

Create `src/tasks/localJsonStore.ts`:

```ts
import { DEFAULT_FIELDS, DEFAULT_VIEWS } from './defaults.ts'
import { normalizeTask } from './model.ts'
import type { FieldDefinition, Tag, TaskAppData, ViewDefinition } from './types.ts'

export function createEmptyTaskData(): TaskAppData {
  return {
    version: 1,
    tasks: [],
    tags: [],
    fields: structuredClone(DEFAULT_FIELDS),
    views: structuredClone(DEFAULT_VIEWS),
    ui: { activeViewId: 'grid-default' },
  }
}

export function normalizeTaskData(value: unknown): TaskAppData {
  if (!isRecord(value)) throw new Error('task data root must be an object')
  const empty = createEmptyTaskData()
  const tasks = arrayValue(value.tasks, 'tasks').map(normalizeTask)
  const tags = arrayValue(value.tags, 'tags').filter(isTag)
  const fields = arrayValue(value.fields, 'fields').filter(isField)
  const views = arrayValue(value.views, 'views').filter(isView)
  const ui = isRecord(value.ui) ? value.ui : {}
  const activeViewId = typeof ui.activeViewId === 'string' ? ui.activeViewId : empty.ui.activeViewId
  const selectedTaskId = typeof ui.selectedTaskId === 'string' ? ui.selectedTaskId : undefined

  return {
    version: 1,
    tasks,
    tags,
    fields: fields.length > 0 ? fields : empty.fields,
    views: views.length > 0 ? views : empty.views,
    ui: { activeViewId, selectedTaskId },
  }
}

function arrayValue(value: unknown, field: string): unknown[] {
  if (value == null) return []
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`)
  return value
}

function isTag(value: unknown): value is Tag {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.color === 'string'
}

function isField(value: unknown): value is FieldDefinition {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.type === 'string'
}

function isView(value: unknown): value is ViewDefinition {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string' && typeof value.type === 'string' && Array.isArray(value.visibleFieldIds)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
```

- [ ] **Step 4: Implement task db**

Create `src/tasks/db.ts`:

```ts
import { isTauri } from '@tauri-apps/api/core'
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { readDevDataFile, writeDevDataFile } from '../db/devFileStorage.ts'
import { createEmptyTaskData, normalizeTaskData } from './localJsonStore.ts'
import type { Tag, Task, TaskAppData, ViewDefinition } from './types.ts'

const DATA_FILE = 'task-data.json'

let dataPromise: Promise<TaskAppData> | null = null
let memoryData: TaskAppData = createEmptyTaskData()
let writeQueue = Promise.resolve()

async function readFromDisk(): Promise<TaskAppData> {
  if (!isTauri()) {
    return normalizeTaskData((await readDevDataFile()) ?? memoryData)
  }

  const fileExists = await exists(DATA_FILE, { baseDir: BaseDirectory.AppData })
  if (!fileExists) {
    const empty = createEmptyTaskData()
    await writeTextFile(DATA_FILE, JSON.stringify(empty, null, 2), { baseDir: BaseDirectory.AppData })
    return empty
  }

  const text = await readTextFile(DATA_FILE, { baseDir: BaseDirectory.AppData })
  return normalizeTaskData(JSON.parse(text))
}

async function getData(): Promise<TaskAppData> {
  dataPromise = dataPromise ?? readFromDisk()
  return dataPromise
}

async function saveData(data: TaskAppData): Promise<void> {
  const normalized = normalizeTaskData(data)
  memoryData = normalized
  dataPromise = Promise.resolve(normalized)
  if (!isTauri()) {
    await writeDevDataFile(normalized)
    return
  }

  writeQueue = writeQueue.catch(() => undefined).then(() =>
    writeTextFile(DATA_FILE, JSON.stringify(normalized, null, 2), { baseDir: BaseDirectory.AppData })
  )
  await writeQueue
}

async function updateData(mutator: (data: TaskAppData) => void): Promise<void> {
  const data = structuredClone(await getData())
  mutator(data)
  await saveData(data)
}

export async function getTaskData(): Promise<TaskAppData> {
  return structuredClone(await getData())
}

export async function getAllTaskRecords(): Promise<Task[]> {
  return (await getData()).tasks
}

export async function addTaskRecord(task: Task): Promise<void> {
  await updateData((data) => {
    data.tasks = data.tasks.filter((item) => item.id !== task.id)
    data.tasks.push(task)
  })
}

export async function updateTaskRecord(task: Task): Promise<void> {
  await addTaskRecord(task)
}

export async function deleteTaskRecord(id: string): Promise<void> {
  await updateData((data) => {
    data.tasks = data.tasks.filter((task) => task.id !== id)
    data.ui.selectedTaskId = data.ui.selectedTaskId === id ? undefined : data.ui.selectedTaskId
  })
}

export async function addTagRecord(tag: Tag): Promise<void> {
  await updateData((data) => {
    data.tags = data.tags.filter((item) => item.id !== tag.id)
    data.tags.push(tag)
  })
}

export async function updateViewRecord(view: ViewDefinition): Promise<void> {
  await updateData((data) => {
    data.views = data.views.map((item) => (item.id === view.id ? view : item))
  })
}

export async function setActiveViewId(activeViewId: string): Promise<void> {
  await updateData((data) => {
    data.ui.activeViewId = activeViewId
  })
}

export async function setSelectedTaskId(selectedTaskId: string | undefined): Promise<void> {
  await updateData((data) => {
    data.ui.selectedTaskId = selectedTaskId
  })
}

export async function __resetTaskDataForTests(): Promise<void> {
  memoryData = createEmptyTaskData()
  dataPromise = Promise.resolve(memoryData)
  await writeDevDataFile(memoryData)
}
```

- [ ] **Step 5: Run storage tests**

Run:

```bash
npm test -- tests/taskLocalJsonStore.test.ts tests/taskDb.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tasks/localJsonStore.ts src/tasks/db.ts tests/taskLocalJsonStore.test.ts tests/taskDb.test.ts
git commit -m "feat: add multiview task storage"
```

---

### Task 5: Add Zustand Task Store

**Files:**
- Create: `src/tasks/store.ts`
- Modify: `tests/taskModel.test.ts`

- [ ] **Step 1: Add store-oriented model coverage**

Append to `tests/taskModel.test.ts`:

```ts
import { applyFilters, applySorts } from '../src/tasks/model.ts'

test('applyFilters and applySorts support grid view data preparation', () => {
  const tasks = [
    createTask({ title: 'B', status: 'todo', priority: 'low' }, '2026-04-27T12:00:00.000Z'),
    createTask({ title: 'A', status: 'doing', priority: 'urgent' }, '2026-04-27T12:00:00.000Z'),
  ]

  const filtered = applyFilters(tasks, [{ fieldId: 'status', operator: 'is', value: 'doing' }], '2026-04-27')
  const sorted = applySorts(tasks, [{ fieldId: 'priority', direction: 'asc' }])

  assert.equal(filtered[0].title, 'A')
  assert.equal(sorted[0].priority, 'urgent')
})
```

- [ ] **Step 2: Run model tests**

Run:

```bash
npm test -- tests/taskModel.test.ts
```

Expected: PASS.

- [ ] **Step 3: Implement store**

Create `src/tasks/store.ts`:

```ts
import { create } from 'zustand'
import * as db from './db.ts'
import { TAG_COLORS } from './defaults.ts'
import { applyFilters, applySorts, createTask, getTaskSummary, updateTask } from './model.ts'
import type { FieldDefinition, FilterRule, SortRule, Tag, Task, TaskAppData, TaskSummary, ViewDefinition } from './types.ts'

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

export interface TaskStore {
  tasks: Task[]
  tags: Tag[]
  fields: FieldDefinition[]
  views: ViewDefinition[]
  activeViewId: string
  selectedTaskId?: string
  loading: boolean
  error: string | null
  init: () => Promise<void>
  createTask: (input: Partial<Task> & { title: string }) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task | undefined>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<Task | undefined>
  createTag: (name: string, color?: string) => Promise<Tag>
  updateView: (view: ViewDefinition) => Promise<void>
  setActiveView: (id: string) => Promise<void>
  setSelectedTask: (id: string | undefined) => Promise<void>
  getPreparedTasks: (view: ViewDefinition) => Task[]
  getSummary: () => TaskSummary
  subscribeExternal: (listener: Listener) => () => void
}

function applyData(data: TaskAppData) {
  return {
    tasks: data.tasks,
    tags: data.tags,
    fields: data.fields,
    views: data.views,
    activeViewId: data.ui.activeViewId,
    selectedTaskId: data.ui.selectedTaskId,
  }
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  tags: [],
  fields: [],
  views: [],
  activeViewId: 'grid-default',
  selectedTaskId: undefined,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const data = await db.getTaskData()
      set({ ...applyData(data), loading: false })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  createTask: async (input) => {
    const task = createTask(input)
    await db.addTaskRecord(task)
    await get().init()
    notify()
    return task
  },

  updateTask: async (id, updates) => {
    const existing = get().tasks.find((task) => task.id === id)
    if (!existing) return undefined
    const next = updateTask(existing, updates)
    await db.updateTaskRecord(next)
    await get().init()
    notify()
    return next
  },

  deleteTask: async (id) => {
    await db.deleteTaskRecord(id)
    await get().init()
    notify()
  },

  completeTask: async (id) => get().updateTask(id, { status: 'done' }),

  createTag: async (name, color) => {
    const existing = get().tags.find((tag) => tag.name === name)
    if (existing) return existing
    const tag: Tag = {
      id: crypto.randomUUID(),
      name,
      color: color ?? TAG_COLORS[get().tags.length % TAG_COLORS.length],
    }
    await db.addTagRecord(tag)
    await get().init()
    notify()
    return tag
  },

  updateView: async (view) => {
    await db.updateViewRecord(view)
    await get().init()
    notify()
  },

  setActiveView: async (id) => {
    await db.setActiveViewId(id)
    await get().init()
    notify()
  },

  setSelectedTask: async (id) => {
    await db.setSelectedTaskId(id)
    await get().init()
    notify()
  },

  getPreparedTasks: (view) => applySorts(applyFilters(get().tasks, view.filters), view.sorts),

  getSummary: () => getTaskSummary(get().tasks),

  subscribeExternal: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}))

;(globalThis as any).__taskStore = useTaskStore
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- tests/taskModel.test.ts tests/taskDb.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tasks/store.ts tests/taskModel.test.ts
git commit -m "feat: add multiview task store"
```

---

### Task 6: Rewrite Agent Tools for the New Task Model

**Files:**
- Create: `src/tasks/agentTools.ts`
- Modify: `src/agent/tools.ts`
- Modify: `src/agent/prompts.ts`
- Create: `tests/taskAgentTools.test.ts`

- [ ] **Step 1: Write agent tool tests**

Create `tests/taskAgentTools.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { __resetTaskDataForTests } from '../src/tasks/db.ts'
import { useTaskStore } from '../src/tasks/store.ts'
import { taskTools } from '../src/tasks/agentTools.ts'

test('create_task creates a structured task and list_tasks returns it', async () => {
  await __resetTaskDataForTests()
  await useTaskStore.getState().init()

  const created = await taskTools.create_task.execute({ title: 'Call customer', priority: 'high', dueDate: '2026-04-28', tags: ['work'] })
  const listed = await taskTools.list_tasks.execute({ status: 'all' })

  assert.match(created, /Created task/)
  assert.match(listed, /Call customer/)
  assert.equal(useTaskStore.getState().tasks[0].priority, 'high')
  assert.equal(useTaskStore.getState().tags[0].name, 'work')
})

test('complete_task marks a task done', async () => {
  await __resetTaskDataForTests()
  await useTaskStore.getState().init()
  const task = await useTaskStore.getState().createTask({ title: 'Finish' })

  const result = await taskTools.complete_task.execute({ id: task.id })

  assert.match(result, /Completed task/)
  assert.equal(useTaskStore.getState().tasks[0].status, 'done')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- tests/taskAgentTools.test.ts
```

Expected: FAIL with module-not-found for `src/tasks/agentTools.ts`.

- [ ] **Step 3: Implement new tools**

Create `src/tasks/agentTools.ts`:

```ts
import { z } from 'zod'
import { useTaskStore } from './store.ts'
import type { Task, TaskPriority, TaskStatus } from './types.ts'

export interface Tool {
  name: string
  description: string
  inputSchema: z.ZodType
  execute: (args: unknown) => Promise<string>
}

export const taskTools: Record<string, Tool> = {
  create_task: {
    name: 'create_task',
    description: 'Create a structured task',
    inputSchema: z.object({
      title: z.string(),
      status: z.enum(['todo', 'doing', 'done', 'blocked']).optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
      dueDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    execute: async (input) => {
      const args = input as { title: string; status?: TaskStatus; priority?: TaskPriority; dueDate?: string; tags?: string[]; description?: string }
      const store = useTaskStore.getState()
      const tagIds: string[] = []
      for (const name of args.tags ?? []) {
        const tag = await store.createTag(name)
        tagIds.push(tag.id)
      }
      const task = await store.createTask({ title: args.title, status: args.status, priority: args.priority, dueDate: args.dueDate, tagIds, description: args.description })
      return `Created task: "${task.title}" [id: ${task.id}]`
    },
  },

  update_task: {
    name: 'update_task',
    description: 'Update structured task fields by id',
    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      status: z.enum(['todo', 'doing', 'done', 'blocked']).optional(),
      priority: z.enum(['urgent', 'high', 'medium', 'low']).optional(),
      dueDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
    }),
    execute: async (input) => {
      const args = input as { id: string; title?: string; status?: TaskStatus; priority?: TaskPriority; dueDate?: string | null; description?: string | null; tags?: string[] }
      const store = useTaskStore.getState()
      const updates: Partial<Task> = {}
      if (args.title !== undefined) updates.title = args.title
      if (args.status !== undefined) updates.status = args.status
      if (args.priority !== undefined) updates.priority = args.priority
      if (args.dueDate !== undefined) updates.dueDate = args.dueDate ?? undefined
      if (args.description !== undefined) updates.description = args.description ?? undefined
      if (args.tags) {
        const tagIds: string[] = []
        for (const name of args.tags) tagIds.push((await store.createTag(name)).id)
        updates.tagIds = tagIds
      }
      const task = await store.updateTask(args.id, updates)
      return task ? `Updated task: "${task.title}"` : `No task found with id: "${args.id}"`
    },
  },

  delete_task: {
    name: 'delete_task',
    description: 'Delete a task by id',
    inputSchema: z.object({ id: z.string() }),
    execute: async (input) => {
      const { id } = input as { id: string }
      const store = useTaskStore.getState()
      const task = store.tasks.find((item) => item.id === id)
      if (!task) return `No task found with id: "${id}"`
      await store.deleteTask(id)
      return `Deleted task: "${task.title}"`
    },
  },

  complete_task: {
    name: 'complete_task',
    description: 'Mark a task as done by id',
    inputSchema: z.object({ id: z.string() }),
    execute: async (input) => {
      const { id } = input as { id: string }
      const task = await useTaskStore.getState().completeTask(id)
      return task ? `Completed task: "${task.title}"` : `No task found with id: "${id}"`
    },
  },

  list_tasks: {
    name: 'list_tasks',
    description: 'List tasks with optional status and limit',
    inputSchema: z.object({ status: z.enum(['all', 'todo', 'doing', 'done', 'blocked']).optional(), limit: z.number().optional() }),
    execute: async (input) => {
      const { status = 'all', limit = 20 } = input as { status?: 'all' | TaskStatus; limit?: number }
      let tasks = useTaskStore.getState().tasks
      if (status !== 'all') tasks = tasks.filter((task) => task.status === status)
      tasks = tasks.slice(0, limit)
      if (tasks.length === 0) return 'No tasks found'
      return tasks.map(formatTaskLine).join('\n')
    },
  },

  search_tasks: {
    name: 'search_tasks',
    description: 'Search tasks by title or description',
    inputSchema: z.object({ query: z.string(), limit: z.number().optional() }),
    execute: async (input) => {
      const { query, limit = 20 } = input as { query: string; limit?: number }
      const q = query.toLowerCase()
      const tasks = useTaskStore.getState().tasks.filter((task) => task.title.toLowerCase().includes(q) || (task.description ?? '').toLowerCase().includes(q)).slice(0, limit)
      return tasks.length === 0 ? 'No tasks found' : tasks.map(formatTaskLine).join('\n')
    },
  },

  get_task_summary: {
    name: 'get_task_summary',
    description: 'Get task counts for reports',
    inputSchema: z.object({}),
    execute: async () => {
      const summary = useTaskStore.getState().getSummary()
      return `Total: ${summary.total}\nActive: ${summary.active}\nCompleted: ${summary.completed}\nOverdue: ${summary.overdue}\nDue today: ${summary.dueToday}`
    },
  },
}

function formatTaskLine(task: Task): string {
  const due = task.dueDate ? ` | due: ${task.dueDate}` : ''
  return `[id: ${task.id}] [${task.status}] [${task.priority}] ${task.title}${due}`
}
```

- [ ] **Step 4: Re-export new tools from existing agent module**

Replace `src/agent/tools.ts` with:

```ts
export type { Tool } from '../tasks/agentTools.ts'
export { taskTools as todoTools } from '../tasks/agentTools.ts'
```

- [ ] **Step 5: Update prompt language**

Modify `src/agent/prompts.ts` so it names the new tools:

```ts
const TASK_TOOL_GUIDANCE = `
Use structured task tools when the user asks to create, update, complete, delete, list, search, or summarize tasks.
Prefer create_task, update_task, complete_task, delete_task, list_tasks, search_tasks, and get_task_summary.
When updating a task, use the full task id shown by list_tasks or search_tasks.
`
```

Keep the rest of the file's existing provider/model wording intact.

- [ ] **Step 6: Run agent tool tests**

Run:

```bash
npm test -- tests/taskAgentTools.test.ts tests/toolSchema.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tasks/agentTools.ts src/agent/tools.ts src/agent/prompts.ts tests/taskAgentTools.test.ts
git commit -m "feat: rewrite agent tools for multiview tasks"
```

---

### Task 7: Build Multiview Workspace Shell and Detail Panel

**Files:**
- Create: `src/components/multiview/TaskWorkspace.tsx`
- Create: `src/components/multiview/TaskToolbar.tsx`
- Create: `src/components/multiview/TaskDetailPanel.tsx`
- Create: `src/components/multiview/styles.css`
- Modify: `src/App.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create detail panel**

Create `src/components/multiview/TaskDetailPanel.tsx`:

```tsx
import { useMemo } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { TaskPriority, TaskStatus } from '../../tasks/types.ts'

export function TaskDetailPanel() {
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId)
  const tasks = useTaskStore((state) => state.tasks)
  const tags = useTaskStore((state) => state.tags)
  const updateTask = useTaskStore((state) => state.updateTask)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const task = useMemo(() => tasks.find((item) => item.id === selectedTaskId), [tasks, selectedTaskId])

  if (!task) return null

  return (
    <aside className="task-detail-panel">
      <div className="task-detail-header">
        <strong>任务详情</strong>
        <button type="button" onClick={() => setSelectedTask(undefined)}>关闭</button>
      </div>
      <label>
        标题
        <input value={task.title} onChange={(event) => updateTask(task.id, { title: event.target.value })} />
      </label>
      <label>
        状态
        <select value={task.status} onChange={(event) => updateTask(task.id, { status: event.target.value as TaskStatus })}>
          <option value="todo">待办</option>
          <option value="doing">进行中</option>
          <option value="done">已完成</option>
          <option value="blocked">阻塞</option>
        </select>
      </label>
      <label>
        优先级
        <select value={task.priority} onChange={(event) => updateTask(task.id, { priority: event.target.value as TaskPriority })}>
          <option value="urgent">紧急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </label>
      <label>
        截止日期
        <input type="date" value={task.dueDate ?? ''} onChange={(event) => updateTask(task.id, { dueDate: event.target.value || undefined })} />
      </label>
      <label>
        描述
        <textarea value={task.description ?? ''} onChange={(event) => updateTask(task.id, { description: event.target.value })} />
      </label>
      <div className="task-detail-tags">
        {task.tagIds.map((tagId) => {
          const tag = tags.find((item) => item.id === tagId)
          return tag ? <span key={tag.id} style={{ borderColor: tag.color }}>{tag.name}</span> : null
        })}
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create toolbar**

Create `src/components/multiview/TaskToolbar.tsx`:

```tsx
import { useTaskStore } from '../../tasks/store.ts'

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const setActiveView = useTaskStore((state) => state.setActiveView)
  const createTask = useTaskStore((state) => state.createTask)

  return (
    <div className="task-toolbar">
      <div className="task-view-tabs">
        {views.map((view) => (
          <button key={view.id} className={view.id === activeViewId ? 'active' : ''} type="button" onClick={() => setActiveView(view.id)}>
            {view.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => createTask({ title: '新任务' })}>新建任务</button>
    </div>
  )
}
```

- [ ] **Step 3: Create workspace shell**

Create `src/components/multiview/TaskWorkspace.tsx`:

```tsx
import { useMemo } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import { TaskToolbar } from './TaskToolbar.tsx'
import { TaskDetailPanel } from './TaskDetailPanel.tsx'

export function TaskWorkspace() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId])

  if (!activeView) return <div className="task-workspace-empty">正在初始化任务工作台...</div>

  return (
    <section className="task-workspace">
      <TaskToolbar />
      <div className="task-workspace-body">
        <div className="task-view-surface" data-view-type={activeView.type}>
          {activeView.type === 'grid' && <div>表格视图加载中</div>}
          {activeView.type === 'kanban' && <div>看板视图加载中</div>}
          {activeView.type === 'calendar' && <div>日历视图加载中</div>}
        </div>
        <TaskDetailPanel />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Add styles**

Create `src/components/multiview/styles.css`:

```css
.task-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 640px;
}

.task-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px;
  background: #fff;
}

.task-view-tabs {
  display: flex;
  gap: 4px;
}

.task-view-tabs button,
.task-toolbar button,
.task-detail-header button {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  padding: 6px 10px;
  cursor: pointer;
}

.task-view-tabs button.active {
  background: #111827;
  color: #fff;
}

.task-workspace-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.task-view-surface {
  min-width: 0;
  min-height: 560px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.task-detail-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.task-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-detail-panel label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.task-detail-panel input,
.task-detail-panel select,
.task-detail-panel textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 7px 8px;
  font: inherit;
}

.task-detail-panel textarea {
  min-height: 120px;
  resize: vertical;
}

.task-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-detail-tags span {
  border: 1px solid;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 12px;
}
```

- [ ] **Step 5: Wire workspace into app**

Modify `src/index.css`:

```css
@import './components/multiview/styles.css';

body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f6f7f9;
  color: #111827;
}
```

Replace `src/App.tsx`:

```tsx
import { useEffect } from 'react'
import { ChatContainer } from './components/ChatContainer'
import { TaskWorkspace } from './components/multiview/TaskWorkspace'
import { useTaskStore } from './tasks/store.ts'

export default function App() {
  const init = useTaskStore((state) => state.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ marginBottom: 16, fontSize: 24 }}>TODO with Agent</h1>
      <TaskWorkspace />
      <ChatContainer />
    </div>
  )
}
```

- [ ] **Step 6: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/multiview src/App.tsx src/index.css
git commit -m "feat: add multiview task workspace shell"
```

---

### Task 8: Implement Glide Grid View

**Files:**
- Create: `src/components/multiview/cellRenderers.tsx`
- Create: `src/components/multiview/TaskGridView.tsx`
- Modify: `src/components/multiview/TaskWorkspace.tsx`

- [ ] **Step 1: Add cell helpers**

Create `src/components/multiview/cellRenderers.tsx`:

```tsx
import type { GridCell, GridCellKind, Item } from '@glideapps/glide-data-grid'
import type { FieldDefinition, Tag, Task } from '../../tasks/types.ts'

export function getTaskCell(task: Task, field: FieldDefinition, tags: Tag[]): GridCell {
  if (field.id === 'status' || field.id === 'priority') {
    return { kind: GridCellKind.Text, allowOverlay: true, data: String(task[field.id]), displayData: String(task[field.id]) }
  }
  if (field.id === 'tagIds') {
    const names = task.tagIds.map((id) => tags.find((tag) => tag.id === id)?.name).filter(Boolean).join(', ')
    return { kind: GridCellKind.Text, allowOverlay: true, data: names, displayData: names }
  }
  const value = task[field.id as keyof Task]
  return { kind: GridCellKind.Text, allowOverlay: !field.readOnly, data: value == null ? '' : String(value), displayData: value == null ? '' : String(value) }
}

export function cellToTaskUpdate(field: FieldDefinition, cell: GridCell): Partial<Task> {
  const data = 'data' in cell ? String(cell.data ?? '') : ''
  if (field.readOnly) return {}
  if (field.id === 'title') return { title: data }
  if (field.id === 'status') return data === 'todo' || data === 'doing' || data === 'done' || data === 'blocked' ? { status: data } : {}
  if (field.id === 'priority') return data === 'urgent' || data === 'high' || data === 'medium' || data === 'low' ? { priority: data } : {}
  if (field.id === 'dueDate') return { dueDate: data || undefined }
  if (field.id === 'description') return { description: data }
  return {}
}

export function itemToRowCol([col, row]: Item): { col: number; row: number } {
  return { col, row }
}
```

- [ ] **Step 2: Add grid view**

Create `src/components/multiview/TaskGridView.tsx`:

```tsx
import DataEditor, { GridCellKind, type GridCell, type GridColumn, type Item } from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import { useMemo } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'
import { cellToTaskUpdate, getTaskCell, itemToRowCol } from './cellRenderers.tsx'

interface TaskGridViewProps {
  view: ViewDefinition
}

export function TaskGridView({ view }: TaskGridViewProps) {
  const fields = useTaskStore((state) => state.fields)
  const tags = useTaskStore((state) => state.tags)
  const getPreparedTasks = useTaskStore((state) => state.getPreparedTasks)
  const updateTask = useTaskStore((state) => state.updateTask)
  const updateView = useTaskStore((state) => state.updateView)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const rows = getPreparedTasks(view)
  const visibleFields = useMemo(() => view.visibleFieldIds.map((id) => fields.find((field) => field.id === id)).filter(Boolean), [fields, view.visibleFieldIds])

  const columns: GridColumn[] = visibleFields.map((field) => ({
    id: String(field!.id),
    title: field!.name,
    width: view.columnWidths?.[String(field!.id)] ?? 140,
  }))

  const getCellContent = (item: Item): GridCell => {
    const { col, row } = itemToRowCol(item)
    const task = rows[row]
    const field = visibleFields[col]
    if (!task || !field) return { kind: GridCellKind.Text, allowOverlay: false, data: '', displayData: '' }
    return getTaskCell(task, field, tags)
  }

  return (
    <div style={{ height: 560 }}>
      <DataEditor
        columns={columns}
        rows={rows.length}
        getCellContent={getCellContent}
        onCellEdited={(item, cell) => {
          const { col, row } = itemToRowCol(item)
          const task = rows[row]
          const field = visibleFields[col]
          if (task && field) updateTask(task.id, cellToTaskUpdate(field, cell))
        }}
        onRowAppended={() => {
          useTaskStore.getState().createTask({ title: '新任务' })
        }}
        onCellClicked={(item) => {
          const { row } = itemToRowCol(item)
          const task = rows[row]
          if (task) setSelectedTask(task.id)
        }}
        onColumnResize={(column, newSize) => {
          updateView({ ...view, columnWidths: { ...view.columnWidths, [String(column.id)]: newSize } })
        }}
        rowMarkers="number"
        smoothScrollX
        smoothScrollY
      />
    </div>
  )
}
```

- [ ] **Step 3: Render grid view in workspace**

Modify `src/components/multiview/TaskWorkspace.tsx`:

```tsx
import { useMemo } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import { TaskGridView } from './TaskGridView.tsx'
import { TaskToolbar } from './TaskToolbar.tsx'
import { TaskDetailPanel } from './TaskDetailPanel.tsx'

export function TaskWorkspace() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const activeView = useMemo(() => views.find((view) => view.id === activeViewId) ?? views[0], [views, activeViewId])

  if (!activeView) return <div className="task-workspace-empty">正在初始化任务工作台...</div>

  return (
    <section className="task-workspace">
      <TaskToolbar />
      <div className="task-workspace-body">
        <div className="task-view-surface" data-view-type={activeView.type}>
          {activeView.type === 'grid' && <TaskGridView view={activeView} />}
          {activeView.type === 'kanban' && <div>看板视图加载中</div>}
          {activeView.type === 'calendar' && <div>日历视图加载中</div>}
        </div>
        <TaskDetailPanel />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: PASS. If TypeScript reports Glide type differences, adjust imports to match installed package exports and rerun.

- [ ] **Step 5: Commit**

```bash
git add src/components/multiview/cellRenderers.tsx src/components/multiview/TaskGridView.tsx src/components/multiview/TaskWorkspace.tsx
git commit -m "feat: add editable grid task view"
```

---

### Task 9: Implement Kanban and Calendar Views

**Files:**
- Create: `src/components/multiview/TaskKanbanView.tsx`
- Create: `src/components/multiview/TaskCalendarView.tsx`
- Modify: `src/components/multiview/TaskWorkspace.tsx`
- Modify: `src/components/multiview/styles.css`

- [ ] **Step 1: Add kanban view**

Create `src/components/multiview/TaskKanbanView.tsx`:

```tsx
import { DndContext, type DragEndEvent } from '@dnd-kit/core'
import { useTaskStore } from '../../tasks/store.ts'
import { groupTasks } from '../../tasks/model.ts'
import type { TaskStatus, ViewDefinition } from '../../tasks/types.ts'

const STATUS_COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'todo', title: '待办' },
  { id: 'doing', title: '进行中' },
  { id: 'done', title: '已完成' },
  { id: 'blocked', title: '阻塞' },
]

interface TaskKanbanViewProps {
  view: ViewDefinition
}

export function TaskKanbanView({ view }: TaskKanbanViewProps) {
  const tasks = useTaskStore((state) => state.getPreparedTasks(view))
  const updateTask = useTaskStore((state) => state.updateTask)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const groups = groupTasks(tasks, view.groupBy ?? 'status')

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id)
    const status = event.over?.id
    if (status === 'todo' || status === 'doing' || status === 'done' || status === 'blocked') {
      updateTask(taskId, { status })
    }
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="task-kanban">
        {STATUS_COLUMNS.map((column) => (
          <div key={column.id} className="task-kanban-column" data-droppable-id={column.id}>
            <div className="task-kanban-column-title">{column.title}</div>
            {(groups[column.id] ?? []).map((task) => (
              <button key={task.id} type="button" className="task-kanban-card" onClick={() => setSelectedTask(task.id)}>
                <strong>{task.title}</strong>
                <span>{task.priority}</span>
                {task.dueDate && <small>{task.dueDate}</small>}
              </button>
            ))}
          </div>
        ))}
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 2: Add calendar view**

Create `src/components/multiview/TaskCalendarView.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskCalendarViewProps {
  view: ViewDefinition
}

export function TaskCalendarView({ view }: TaskCalendarViewProps) {
  const [cursor, setCursor] = useState(() => new Date())
  const tasks = useTaskStore((state) => state.getPreparedTasks(view))
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const month = cursor.toISOString().slice(0, 7)
  const days = useMemo(() => buildMonthDays(cursor), [cursor])
  const scheduled = tasks.filter((task) => task.dueDate?.startsWith(month))
  const unscheduled = tasks.filter((task) => !task.dueDate)

  return (
    <div className="task-calendar">
      <div className="task-calendar-header">
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>上月</button>
        <strong>{month}</strong>
        <button type="button" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>下月</button>
      </div>
      <div className="task-calendar-grid">
        {days.map((day) => (
          <div key={day} className="task-calendar-day">
            <span>{day.slice(-2)}</span>
            {scheduled.filter((task) => task.dueDate === day).map((task) => (
              <button key={task.id} type="button" onClick={() => setSelectedTask(task.id)}>{task.title}</button>
            ))}
          </div>
        ))}
      </div>
      <div className="task-unscheduled">
        <strong>未安排日期</strong>
        {unscheduled.map((task) => (
          <button key={task.id} type="button" onClick={() => setSelectedTask(task.id)}>{task.title}</button>
        ))}
      </div>
    </div>
  )
}

function buildMonthDays(cursor: Date): string[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, index) => {
    const day = String(index + 1).padStart(2, '0')
    return `${year}-${String(month + 1).padStart(2, '0')}-${day}`
  })
}
```

- [ ] **Step 3: Render kanban and calendar in workspace**

Modify `src/components/multiview/TaskWorkspace.tsx` imports and body:

```tsx
import { TaskCalendarView } from './TaskCalendarView.tsx'
import { TaskKanbanView } from './TaskKanbanView.tsx'
```

Replace the loading branches:

```tsx
{activeView.type === 'kanban' && <TaskKanbanView view={activeView} />}
{activeView.type === 'calendar' && <TaskCalendarView view={activeView} />}
```

- [ ] **Step 4: Add styles**

Append to `src/components/multiview/styles.css`:

```css
.task-kanban {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: 12px;
  padding: 12px;
  overflow-x: auto;
}

.task-kanban-column {
  min-height: 480px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f9fafb;
  padding: 8px;
}

.task-kanban-column-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.task-kanban-card,
.task-calendar-day button,
.task-unscheduled button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  padding: 8px;
  cursor: pointer;
  text-align: left;
}

.task-calendar {
  padding: 12px;
}

.task-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 8px;
}

.task-calendar-day {
  min-height: 110px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px;
  background: #fff;
}

.task-unscheduled {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/multiview/TaskKanbanView.tsx src/components/multiview/TaskCalendarView.tsx src/components/multiview/TaskWorkspace.tsx src/components/multiview/styles.css
git commit -m "feat: add kanban and calendar task views"
```

---

### Task 10: Final Verification and Browser Check

**Files:**
- Modify only files required to fix verification failures.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 3: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 4: Browser verification**

Open the local URL and verify:

- Grid view renders with columns.
- New task creates a row.
- Editing title/status/priority/due date updates the detail panel.
- View tabs switch to kanban and calendar.
- Agent chat remains visible.
- Asking the agent to create a task results in a visible new task.

- [ ] **Step 5: Commit fixes**

If verification required changes:

```bash
git add src tests package.json package-lock.json
git commit -m "fix: stabilize multiview task workspace"
```

If no changes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- Local single-user data model: Tasks 2, 3, and 4.
- No old data migration: Task 4 initializes a new `task-data.json`.
- Agent chat retained with rewritten tools: Task 6 and Task 7.
- Grid view with Glide Data Grid: Task 8.
- Kanban view: Task 9.
- Calendar view: Task 9.
- Shared detail panel and toolbar: Task 7.
- Filtering/sorting/grouping helpers: Tasks 3 and 5.
- Tests and verification: Tasks 2 through 10.

Completeness scan:

- The word TODO appears only as the product/domain name.
- No unspecified implementation steps remain.
- All commands include expected outcomes.

Type consistency:

- `Task`, `FieldDefinition`, `ViewDefinition`, `FilterRule`, and `SortRule` are defined in Task 2 and reused consistently.
- Store method names in Task 5 match agent tool calls in Task 6 and UI calls in Tasks 7 through 9.
- Date-only fields use `YYYY-MM-DD`; timestamps use ISO datetime strings.
