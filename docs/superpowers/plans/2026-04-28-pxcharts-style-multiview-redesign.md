# pxcharts-Style Multiview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the multiview TODO workspace into a pxcharts-style local task base with fast view switching, command-bar actions, rule-based filters, and preserved agent tools.

**Architecture:** Keep the current task model, local JSON storage, Zustand store, Glide grid, Kanban, Calendar, and PageAgent tool layer. Replace the current flat toolbar/workspace shell with a pxcharts-inspired app surface: left view navigation, command bar, filter chips, dialogs for filter/sort/group/fields, and non-blocking UI-state persistence.

**Tech Stack:** React 18, Vite, TypeScript, Zustand, Tauri/local JSON storage, PageAgent tools, `@glideapps/glide-data-grid`, `@dnd-kit/core`, existing CSS modules/global CSS, `node:test`.

---

## File Structure

Create focused UI and helper modules:

- `src/tasks/viewConfig.ts`: pure helpers for filter/sort/group/field config mutations and chip formatting.
- `tests/taskViewConfig.test.ts`: unit tests for view config helpers.
- `src/components/multiview/TaskBaseSidebar.tsx`: pxcharts-style left table/view navigation.
- `src/components/multiview/TaskCommandBar.tsx`: top command bar with search, field, filter, group, sort, new task controls.
- `src/components/multiview/TaskFilterChips.tsx`: active filter/sort/group chips.
- `src/components/multiview/TaskFilterDialog.tsx`: rule-based filter dialog.
- `src/components/multiview/TaskSortDialog.tsx`: sort dialog.
- `src/components/multiview/TaskGroupDialog.tsx`: group dialog.
- `src/components/multiview/TaskFieldConfigDialog.tsx`: visible field and width reset dialog.
- `src/components/multiview/TaskWorkspace.tsx`: recompose shell using sidebar, command bar, chips, view surface, detail panel.

Modify existing modules:

- `src/tasks/types.ts`: add optional `searchQuery` to `ViewDefinition` only if helper implementation needs view-specific search persistence.
- `src/tasks/localJsonStore.ts`: normalize the optional view search field if added.
- `src/tasks/store.ts`: make active view and view config updates update memory immediately and persist in the background.
- `src/tasks/agentTools.ts`: keep tool behavior, adjust only if `update_view` needs to accept search or new config semantics.
- `src/components/multiview/TaskGridView.tsx`: accept prepared/search-filtered tasks through store helpers or keep current `getPreparedTasks(view.id)` if search lives in view config.
- `src/components/multiview/TaskKanbanView.tsx`: keep existing behavior, verify it respects grouping from dialogs.
- `src/components/multiview/TaskCalendarView.tsx`: keep existing behavior, verify it respects filters/search.
- `src/components/multiview/styles.css`: replace flat toolbar styling with pxcharts-style shell, sidebar, command bar, chips, dialogs.
- `src/agent/prompts.ts`: use multidimensional table vocabulary if not already present.
- `tests/taskStore.test.ts`: cover immediate UI update and background persistence behavior.
- `tests/taskAgentTools.test.ts`: cover that agent-updated view config is reflected in helper chip formatting if relevant.

Do not modify unrelated SQLite migration docs or generated `.superpowers/` browser companion files.

---

## Task 1: Add View Config Helper Layer

**Files:**
- Create: `src/tasks/viewConfig.ts`
- Create: `tests/taskViewConfig.test.ts`

- [ ] **Step 1: Write failing tests for rule, sort, group, field, and chip helpers**

Create `tests/taskViewConfig.test.ts`:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addFilterRule,
  clearFilterRule,
  formatFilterChip,
  formatGroupChip,
  formatSortChip,
  resetColumnWidths,
  setGroupBy,
  setSortRule,
  setVisibleField,
} from '../src/tasks/viewConfig.ts'
import { DEFAULT_FIELDS, DEFAULT_VIEWS } from '../src/tasks/defaults.ts'
import type { FilterRule, SortRule, ViewDefinition } from '../src/tasks/types.ts'

function gridView(): ViewDefinition {
  return {
    ...DEFAULT_VIEWS.find((view) => view.id === 'grid-default')!,
    visibleFieldIds: ['title', 'status', 'priority'],
    filters: [],
    sorts: [],
    columnWidths: { title: 260, status: 120, priority: 100 },
  }
}

test('addFilterRule replaces field/operator-compatible rule and keeps other rules', () => {
  const view = gridView()
  const first: FilterRule = { fieldId: 'status', operator: 'is', value: 'todo' }
  const second: FilterRule = { fieldId: 'priority', operator: 'is', value: 'high' }
  const replaced: FilterRule = { fieldId: 'status', operator: 'is', value: 'doing' }

  const next = addFilterRule(addFilterRule(addFilterRule(view, first), second), replaced)

  assert.deepEqual(next.filters, [second, replaced])
  assert.deepEqual(view.filters, [])
})

test('clearFilterRule removes all rules for the requested field', () => {
  const view = {
    ...gridView(),
    filters: [
      { fieldId: 'status', operator: 'is', value: 'todo' },
      { fieldId: 'priority', operator: 'is', value: 'high' },
    ],
  }

  assert.deepEqual(clearFilterRule(view, 'status').filters, [{ fieldId: 'priority', operator: 'is', value: 'high' }])
})

test('setSortRule replaces sorts with one sort rule', () => {
  const sort: SortRule = { fieldId: 'dueDate', direction: 'asc' }

  assert.deepEqual(setSortRule(gridView(), sort).sorts, [sort])
})

test('setGroupBy updates grouping without mutating the source view', () => {
  const view = gridView()
  const next = setGroupBy(view, 'priority')

  assert.equal(next.groupBy, 'priority')
  assert.equal(view.groupBy, undefined)
})

test('setVisibleField preserves title and toggles other fields', () => {
  const view = gridView()

  assert.deepEqual(setVisibleField(view, 'priority', false).visibleFieldIds, ['title', 'status'])
  assert.deepEqual(setVisibleField(view, 'title', false).visibleFieldIds, ['title', 'status', 'priority'])
  assert.deepEqual(setVisibleField(view, 'dueDate', true).visibleFieldIds, ['title', 'status', 'priority', 'dueDate'])
})

test('resetColumnWidths restores widths from field defaults', () => {
  const view = { ...gridView(), columnWidths: { title: 999 } }
  const next = resetColumnWidths(view, DEFAULT_VIEWS.find((item) => item.id === 'grid-default')!)

  assert.equal(next.columnWidths?.title, 260)
  assert.equal(next.columnWidths?.status, 120)
})

test('chip formatters produce readable labels', () => {
  assert.equal(formatFilterChip({ fieldId: 'status', operator: 'is', value: 'todo' }, DEFAULT_FIELDS), 'Status is todo')
  assert.equal(formatSortChip({ fieldId: 'dueDate', direction: 'asc' }, DEFAULT_FIELDS), 'Due date ascending')
  assert.equal(formatGroupChip('priority', DEFAULT_FIELDS), 'Grouped by Priority')
})
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run:

```bash
npm test -- tests/taskViewConfig.test.ts
```

Expected: FAIL with module-not-found for `src/tasks/viewConfig.ts`.

- [ ] **Step 3: Implement view config helpers**

Create `src/tasks/viewConfig.ts`:

```ts
import type { FieldDefinition, FilterRule, SortRule, ViewDefinition } from './types.ts'

const TITLE_FIELD_ID = 'title'

export function addFilterRule(view: ViewDefinition, rule: FilterRule): ViewDefinition {
  return {
    ...cloneView(view),
    filters: [...view.filters.filter((item) => !(item.fieldId === rule.fieldId && item.operator === rule.operator)), cloneFilter(rule)],
  }
}

export function clearFilterRule(view: ViewDefinition, fieldId: string): ViewDefinition {
  return {
    ...cloneView(view),
    filters: view.filters.filter((rule) => rule.fieldId !== fieldId).map(cloneFilter),
  }
}

export function setSortRule(view: ViewDefinition, sort: SortRule | undefined): ViewDefinition {
  return {
    ...cloneView(view),
    sorts: sort ? [{ ...sort }] : [],
  }
}

export function setGroupBy(view: ViewDefinition, fieldId: string | undefined): ViewDefinition {
  const next = cloneView(view)
  if (fieldId) {
    next.groupBy = fieldId
  } else {
    delete next.groupBy
  }
  return next
}

export function setVisibleField(view: ViewDefinition, fieldId: string, visible: boolean): ViewDefinition {
  const next = cloneView(view)
  if (fieldId === TITLE_FIELD_ID && !visible) {
    return next
  }

  if (visible) {
    next.visibleFieldIds = next.visibleFieldIds.includes(fieldId) ? next.visibleFieldIds : [...next.visibleFieldIds, fieldId]
  } else {
    next.visibleFieldIds = next.visibleFieldIds.filter((item) => item !== fieldId)
    if (!next.visibleFieldIds.includes(TITLE_FIELD_ID)) {
      next.visibleFieldIds.unshift(TITLE_FIELD_ID)
    }
  }
  return next
}

export function resetColumnWidths(view: ViewDefinition, defaultView: ViewDefinition): ViewDefinition {
  return {
    ...cloneView(view),
    columnWidths: defaultView.columnWidths ? { ...defaultView.columnWidths } : undefined,
  }
}

export function formatFilterChip(rule: FilterRule, fields: FieldDefinition[]): string {
  const field = fieldName(rule.fieldId, fields)
  const operator = operatorLabel(rule.operator)
  if (rule.value === undefined || rule.value === null || rule.value === '') {
    return `${field} ${operator}`
  }
  if (Array.isArray(rule.value)) {
    return `${field} ${operator} ${rule.value.join(' to ')}`
  }
  return `${field} ${operator} ${String(rule.value)}`
}

export function formatSortChip(sort: SortRule, fields: FieldDefinition[]): string {
  return `${fieldName(sort.fieldId, fields)} ${sort.direction === 'asc' ? 'ascending' : 'descending'}`
}

export function formatGroupChip(fieldId: string | undefined, fields: FieldDefinition[]): string | undefined {
  return fieldId ? `Grouped by ${fieldName(fieldId, fields)}` : undefined
}

function cloneView(view: ViewDefinition): ViewDefinition {
  return {
    ...view,
    visibleFieldIds: [...view.visibleFieldIds],
    filters: view.filters.map(cloneFilter),
    sorts: view.sorts.map((sort) => ({ ...sort })),
    ...(view.columnWidths ? { columnWidths: { ...view.columnWidths } } : {}),
  }
}

function cloneFilter(rule: FilterRule): FilterRule {
  return {
    ...rule,
    ...(Array.isArray(rule.value) ? { value: [...rule.value] } : 'value' in rule ? { value: rule.value } : {}),
  }
}

function fieldName(fieldId: string, fields: FieldDefinition[]): string {
  return fields.find((field) => field.id === fieldId)?.name ?? fieldId
}

function operatorLabel(operator: FilterRule['operator']): string {
  if (operator === 'is') return 'is'
  if (operator === 'isNot') return 'is not'
  if (operator === 'isEmpty') return 'is empty'
  if (operator === 'isNotEmpty') return 'is not empty'
  return operator
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test -- tests/taskViewConfig.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tasks/viewConfig.ts tests/taskViewConfig.test.ts
git commit -m "feat: add task view config helpers"
```

---

## Task 2: Make UI View State Non-Blocking

**Files:**
- Modify: `src/tasks/store.ts`
- Modify: `tests/taskStore.test.ts`

- [ ] **Step 1: Add failing tests for immediate active-view and view-config updates**

Append to `tests/taskStore.test.ts`:

```ts
test('setActiveView updates memory before persistence finishes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })

  const promise = useTaskStore.getState().setActiveView('kanban-status')

  assert.equal(useTaskStore.getState().activeViewId, 'kanban-status')
  await promise
  assert.equal(useTaskStore.getState().activeViewId, 'kanban-status')
})

test('updateView updates memory before persistence finishes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })
  const view = useTaskStore.getState().views.find((item) => item.id === 'grid-default')!
  const promise = useTaskStore.getState().updateView({ ...view, name: 'Fast Grid' })

  assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Fast Grid')
  await promise
  assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Fast Grid')
})
```

- [ ] **Step 2: Run store tests to verify behavior**

Run:

```bash
npm test -- tests/taskStore.test.ts
```

Expected before implementation: FAIL because `setActiveView` and `updateView` update state only after persistence returns.

- [ ] **Step 3: Refactor store persistence helpers**

In `src/tasks/store.ts`, add helpers near `serializeWrite`:

```ts
function setViewInMemory(set: (partial: Partial<TaskStore>) => void, view: ViewDefinition): void {
  const state = useTaskStore.getState()
  set({
    views: state.views.map((item) => (item.id === view.id ? cloneView(view) : item)),
    error: null,
  })
}

function setActiveViewInMemory(set: (partial: Partial<TaskStore>) => void, viewId: string): void {
  set({ activeViewId: viewId, error: null })
}
```

Then replace `updateView` with immediate update plus serialized persistence:

```ts
  updateView: (view) => {
    const cloned = cloneView(view)
    setViewInMemory(set, cloned)
    notifyExternal()

    return serializeWrite(async () => {
      try {
        await db.updateViewRecord(cloned)
        const data = await db.getTaskData()
        const storedView = data.views.find((item) => item.id === cloned.id)
        if (!storedView) {
          throw new Error('view was not saved')
        }

        set({
          views: data.views,
          activeViewId: data.ui.activeViewId,
          error: null,
        })
        notifyExternal()
        return storedView
      } catch (error) {
        set({ error: getErrorMessage(error) })
        throw error
      }
    })
  },
```

Replace `setActiveView` with immediate update plus serialized persistence:

```ts
  setActiveView: (viewId) => {
    const state = get()
    const fallbackViewId = state.views.find((view) => view.id === 'grid-default')?.id ?? state.views[0]?.id ?? 'grid-default'
    const normalizedViewId = viewId.trim() === '' || !state.views.some((view) => view.id === viewId) ? fallbackViewId : viewId
    setActiveViewInMemory(set, normalizedViewId)
    notifyExternal()

    return serializeWrite(async () => {
      try {
        await db.setActiveViewId(normalizedViewId)
        const nextData = await db.getTaskData()
        set({ activeViewId: nextData.ui.activeViewId, error: null })
        notifyExternal()
      } catch (error) {
        set({ error: getErrorMessage(error) })
        throw error
      }
    })
  },
```

If TypeScript rejects helper signatures because `set` is a Zustand internal function, inline the `set(...)` calls directly in `updateView` and `setActiveView` using the same state updates.

- [ ] **Step 4: Run store tests**

Run:

```bash
npm test -- tests/taskStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/tasks/store.ts tests/taskStore.test.ts
git commit -m "fix: make task view state updates immediate"
```

---

## Task 3: Build pxcharts-Style Workspace Shell

**Files:**
- Create: `src/components/multiview/TaskBaseSidebar.tsx`
- Modify: `src/components/multiview/TaskWorkspace.tsx`
- Modify: `src/components/multiview/styles.css`

- [ ] **Step 1: Create sidebar component**

Create `src/components/multiview/TaskBaseSidebar.tsx`:

```tsx
import { useTaskStore } from '../../tasks/store.ts'

const VIEW_LABEL_BY_TYPE = {
  grid: '表格',
  kanban: '看板',
  calendar: '日历',
} as const

export function TaskBaseSidebar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const tasks = useTaskStore((state) => state.tasks)
  const setActiveView = useTaskStore((state) => state.setActiveView)

  return (
    <aside className="task-base-sidebar" aria-label="任务表导航">
      <div className="task-base-sidebar__brand">
        <strong>TODO Base</strong>
        <span>本地任务表</span>
      </div>
      <div className="task-base-sidebar__table is-active">
        <span className="task-base-sidebar__dot" />
        <div>
          <strong>任务管理表</strong>
          <span>{tasks.length} 条记录 · {views.length} 个视图</span>
        </div>
      </div>
      <div className="task-base-sidebar__section-title">视图模式</div>
      <nav className="task-base-sidebar__views">
        {views.map((view) => (
          <button
            className={view.id === activeViewId ? 'is-active' : ''}
            key={view.id}
            onClick={() => void setActiveView(view.id).catch(console.error)}
            type="button"
          >
            <span>{VIEW_LABEL_BY_TYPE[view.type]}</span>
            <small>{view.name}</small>
          </button>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Recompose workspace shell**

Replace `src/components/multiview/TaskWorkspace.tsx` with:

```tsx
import { Suspense, lazy } from 'react'
import { TaskBaseSidebar } from './TaskBaseSidebar.tsx'
import { TaskDetailPanel } from './TaskDetailPanel.tsx'
import { TaskToolbar } from './TaskToolbar.tsx'
import { useTaskStore } from '../../tasks/store.ts'

const TaskGridView = lazy(() => import('./TaskGridView.tsx').then((module) => ({ default: module.TaskGridView })))
const TaskKanbanView = lazy(() => import('./TaskKanbanView.tsx').then((module) => ({ default: module.TaskKanbanView })))
const TaskCalendarView = lazy(() => import('./TaskCalendarView.tsx').then((module) => ({ default: module.TaskCalendarView })))

export function TaskWorkspace() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const error = useTaskStore((state) => state.error)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]

  return (
    <main className="task-base">
      <TaskBaseSidebar />
      <section className="task-base__main" aria-label="任务工作区">
        <TaskToolbar />
        {error && <div className="task-workspace__error">{error}</div>}
        <div className="task-base__view-shell">
          <Suspense fallback={<div className="task-base__loading">正在加载视图...</div>}>
            {activeView?.type === 'grid' && <TaskGridView view={activeView} />}
            {activeView?.type === 'kanban' && <TaskKanbanView view={activeView} />}
            {activeView?.type === 'calendar' && <TaskCalendarView view={activeView} />}
          </Suspense>
        </div>
      </section>
      <TaskDetailPanel />
    </main>
  )
}
```

- [ ] **Step 3: Add shell CSS**

Append to `src/components/multiview/styles.css`:

```css
.task-base {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) auto;
  min-height: calc(100vh - 96px);
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.task-base-sidebar {
  border-right: 1px solid #e5e7eb;
  background: #f8fafc;
  padding: 18px 14px;
}

.task-base-sidebar__brand {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 22px;
}

.task-base-sidebar__brand strong {
  color: #0f172a;
  font-size: 22px;
}

.task-base-sidebar__brand span,
.task-base-sidebar__table span,
.task-base-sidebar__views small {
  color: #64748b;
  font-size: 12px;
}

.task-base-sidebar__table {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: center;
  border-radius: 8px;
  padding: 12px;
  background: #eaf2ff;
}

.task-base-sidebar__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3b82f6;
}

.task-base-sidebar__section-title {
  margin: 22px 0 8px;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.task-base-sidebar__views {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-base-sidebar__views button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  padding: 10px 12px;
  color: #0f172a;
  cursor: pointer;
  text-align: left;
}

.task-base-sidebar__views button.is-active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #1d4ed8;
}

.task-base__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.task-base__view-shell {
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.task-base__loading {
  padding: 24px;
  color: #64748b;
}
```

- [ ] **Step 4: Run build**

Run:

```bash
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run build
```

Expected: PASS. If `dist/index.html` changes, run `git restore -- dist/index.html`.

- [ ] **Step 5: Commit**

```bash
git add src/components/multiview/TaskBaseSidebar.tsx src/components/multiview/TaskWorkspace.tsx src/components/multiview/styles.css
git commit -m "feat: add pxcharts-style task base shell"
```

---

## Task 4: Replace Flat Toolbar With Command Bar and Filter Chips

**Files:**
- Create: `src/components/multiview/TaskCommandBar.tsx`
- Create: `src/components/multiview/TaskFilterChips.tsx`
- Modify: `src/components/multiview/TaskToolbar.tsx`
- Modify: `src/components/multiview/styles.css`

- [ ] **Step 1: Create filter chips component**

Create `src/components/multiview/TaskFilterChips.tsx`:

```tsx
import { DEFAULT_VIEWS } from '../../tasks/defaults.ts'
import { clearFilterRule, formatFilterChip, formatGroupChip, formatSortChip, setGroupBy, setSortRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskFilterChipsProps {
  view: ViewDefinition
}

export function TaskFilterChips({ view }: TaskFilterChipsProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const groupChip = formatGroupChip(view.groupBy, fields)
  const sortChip = view.sorts[0] ? formatSortChip(view.sorts[0], fields) : undefined
  const defaultGrid = DEFAULT_VIEWS.find((item) => item.id === 'grid-default')
  const hasChips = view.filters.length > 0 || Boolean(sortChip) || Boolean(groupChip)

  if (!hasChips) {
    return null
  }

  return (
    <div className="task-filter-chips" aria-label="当前视图条件">
      {view.filters.map((filter) => (
        <button key={`${filter.fieldId}-${filter.operator}`} type="button" onClick={() => void updateView(clearFilterRule(view, filter.fieldId)).catch(console.error)}>
          {formatFilterChip(filter, fields)} <span>×</span>
        </button>
      ))}
      {sortChip && (
        <button type="button" onClick={() => void updateView(setSortRule(view, undefined)).catch(console.error)}>
          {sortChip} <span>×</span>
        </button>
      )}
      {groupChip && (
        <button type="button" onClick={() => void updateView(setGroupBy(view, defaultGrid?.groupBy)).catch(console.error)}>
          {groupChip} <span>×</span>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create command bar component**

Create `src/components/multiview/TaskCommandBar.tsx`:

```tsx
import { useState } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskCommandBarProps {
  view: ViewDefinition
  onOpenFields: () => void
  onOpenFilters: () => void
  onOpenGroup: () => void
  onOpenSort: () => void
}

export function TaskCommandBar({ view, onOpenFields, onOpenFilters, onOpenGroup, onOpenSort }: TaskCommandBarProps) {
  const createTask = useTaskStore((state) => state.createTask)
  const [query, setQuery] = useState('')

  return (
    <div className="task-command-bar">
      <div className="task-command-bar__search">
        <span aria-hidden="true">⌕</span>
        <input aria-label="搜索记录" placeholder="搜索记录..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="task-command-bar__actions" aria-label={`${view.name} 操作`}>
        <button type="button" onClick={onOpenFields}>字段管理</button>
        <button type="button" onClick={onOpenFilters}>数据筛选</button>
        <button type="button" onClick={onOpenGroup}>分组</button>
        <button type="button" onClick={onOpenSort}>排序</button>
        <button className="task-command-bar__primary" type="button" onClick={() => void createTask({ title: '新任务' }).catch(console.error)}>
          新建任务
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Replace toolbar composition**

Replace `src/components/multiview/TaskToolbar.tsx` with:

```tsx
import { useState } from 'react'
import { TaskCommandBar } from './TaskCommandBar.tsx'
import { TaskFieldConfigDialog } from './TaskFieldConfigDialog.tsx'
import { TaskFilterChips } from './TaskFilterChips.tsx'
import { TaskFilterDialog } from './TaskFilterDialog.tsx'
import { TaskGroupDialog } from './TaskGroupDialog.tsx'
import { TaskSortDialog } from './TaskSortDialog.tsx'
import { useTaskStore } from '../../tasks/store.ts'

export function TaskToolbar() {
  const views = useTaskStore((state) => state.views)
  const activeViewId = useTaskStore((state) => state.activeViewId)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const [dialog, setDialog] = useState<'filter' | 'sort' | 'group' | 'fields' | undefined>()

  if (!activeView) {
    return null
  }

  return (
    <header className="task-toolbar">
      <TaskCommandBar
        view={activeView}
        onOpenFields={() => setDialog('fields')}
        onOpenFilters={() => setDialog('filter')}
        onOpenGroup={() => setDialog('group')}
        onOpenSort={() => setDialog('sort')}
      />
      <TaskFilterChips view={activeView} />
      <TaskFilterDialog open={dialog === 'filter'} onOpenChange={(open) => setDialog(open ? 'filter' : undefined)} view={activeView} />
      <TaskSortDialog open={dialog === 'sort'} onOpenChange={(open) => setDialog(open ? 'sort' : undefined)} view={activeView} />
      <TaskGroupDialog open={dialog === 'group'} onOpenChange={(open) => setDialog(open ? 'group' : undefined)} view={activeView} />
      <TaskFieldConfigDialog open={dialog === 'fields'} onOpenChange={(open) => setDialog(open ? 'fields' : undefined)} view={activeView} />
    </header>
  )
}
```

The dialog imports will fail until Tasks 5 and 6 create those files.

- [ ] **Step 4: Add command bar and chip CSS**

Append to `src/components/multiview/styles.css`:

```css
.task-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid #e5e7eb;
  padding: 14px 16px;
  background: #fff;
}

.task-command-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.task-command-bar__search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 100%);
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  padding: 8px 10px;
  color: #64748b;
}

.task-command-bar__search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  font: inherit;
}

.task-command-bar__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.task-command-bar__actions button,
.task-filter-chips button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #fff;
  padding: 7px 10px;
  color: #0f172a;
  cursor: pointer;
  font: inherit;
}

.task-command-bar__actions .task-command-bar__primary {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.task-filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.task-filter-chips button {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}
```

- [ ] **Step 5: Do not run build yet**

Expected: Build fails until dialog files exist. Continue to Task 5.

---

## Task 5: Add Filter, Sort, Group, and Field Dialogs

**Files:**
- Create: `src/components/multiview/TaskFilterDialog.tsx`
- Create: `src/components/multiview/TaskSortDialog.tsx`
- Create: `src/components/multiview/TaskGroupDialog.tsx`
- Create: `src/components/multiview/TaskFieldConfigDialog.tsx`
- Modify: `src/components/multiview/styles.css`

- [ ] **Step 1: Add filter dialog**

Create `src/components/multiview/TaskFilterDialog.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { addFilterRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { FilterRule, ViewDefinition } from '../../tasks/types.ts'

interface TaskFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

const OPERATORS: FilterRule['operator'][] = ['is', 'isNot', 'contains', 'isEmpty', 'isNotEmpty', 'before', 'after', 'between']

export function TaskFilterDialog({ open, onOpenChange, view }: TaskFilterDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const [fieldId, setFieldId] = useState('status')
  const [operator, setOperator] = useState<FilterRule['operator']>('is')
  const [value, setValue] = useState('todo')
  const selectedField = useMemo(() => fields.find((field) => field.id === fieldId), [fieldId, fields])

  if (!open) return null

  const apply = () => {
    const rule: FilterRule = operator === 'isEmpty' || operator === 'isNotEmpty'
      ? { fieldId, operator }
      : operator === 'between'
        ? { fieldId, operator, value: value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 2) }
        : { fieldId, operator, value }
    void updateView(addFilterRule(view, rule)).then(() => onOpenChange(false)).catch(console.error)
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="数据筛选" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>数据筛选</h2><button type="button" onClick={() => onOpenChange(false)}>×</button></header>
        <label><span>字段</span><select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>{fields.map((field) => <option key={String(field.id)} value={String(field.id)}>{field.name}</option>)}</select></label>
        <label><span>条件</span><select value={operator} onChange={(event) => setOperator(event.target.value as FilterRule['operator'])}>{OPERATORS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        {operator !== 'isEmpty' && operator !== 'isNotEmpty' && (
          <label>
            <span>值</span>
            {selectedField?.options ? (
              <select value={value} onChange={(event) => setValue(event.target.value)}>{selectedField.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select>
            ) : (
              <input value={value} onChange={(event) => setValue(event.target.value)} placeholder={operator === 'between' ? '2026-04-01, 2026-04-30' : '输入筛选值'} />
            )}
          </label>
        )}
        <footer><button type="button" onClick={() => onOpenChange(false)}>取消</button><button type="button" onClick={apply}>应用筛选</button></footer>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Add sort dialog**

Create `src/components/multiview/TaskSortDialog.tsx`:

```tsx
import { useState } from 'react'
import { setSortRule } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { SortRule, ViewDefinition } from '../../tasks/types.ts'

interface TaskSortDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

export function TaskSortDialog({ open, onOpenChange, view }: TaskSortDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const [fieldId, setFieldId] = useState(view.sorts[0]?.fieldId ?? 'createdAt')
  const [direction, setDirection] = useState<SortRule['direction']>(view.sorts[0]?.direction ?? 'desc')

  if (!open) return null

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="排序" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>排序</h2><button type="button" onClick={() => onOpenChange(false)}>×</button></header>
        <label><span>字段</span><select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>{fields.map((field) => <option key={String(field.id)} value={String(field.id)}>{field.name}</option>)}</select></label>
        <label><span>方向</span><select value={direction} onChange={(event) => setDirection(event.target.value as SortRule['direction'])}><option value="asc">升序</option><option value="desc">降序</option></select></label>
        <footer>
          <button type="button" onClick={() => void updateView(setSortRule(view, undefined)).then(() => onOpenChange(false)).catch(console.error)}>清除</button>
          <button type="button" onClick={() => void updateView(setSortRule(view, { fieldId, direction })).then(() => onOpenChange(false)).catch(console.error)}>应用排序</button>
        </footer>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Add group dialog**

Create `src/components/multiview/TaskGroupDialog.tsx`:

```tsx
import { useState } from 'react'
import { setGroupBy } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

const GROUP_FIELDS = ['status', 'priority', 'tagIds']

export function TaskGroupDialog({ open, onOpenChange, view }: TaskGroupDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const [fieldId, setFieldId] = useState(view.groupBy ?? 'status')

  if (!open) return null

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="分组" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>分组</h2><button type="button" onClick={() => onOpenChange(false)}>×</button></header>
        <label><span>分组字段</span><select value={fieldId} onChange={(event) => setFieldId(event.target.value)}>{GROUP_FIELDS.map((id) => <option key={id} value={id}>{fields.find((field) => field.id === id)?.name ?? id}</option>)}</select></label>
        <footer>
          <button type="button" onClick={() => void updateView(setGroupBy(view, undefined)).then(() => onOpenChange(false)).catch(console.error)}>清除</button>
          <button type="button" onClick={() => void updateView(setGroupBy(view, fieldId)).then(() => onOpenChange(false)).catch(console.error)}>应用分组</button>
        </footer>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Add field config dialog**

Create `src/components/multiview/TaskFieldConfigDialog.tsx`:

```tsx
import { DEFAULT_VIEWS } from '../../tasks/defaults.ts'
import { resetColumnWidths, setVisibleField } from '../../tasks/viewConfig.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { ViewDefinition } from '../../tasks/types.ts'

interface TaskFieldConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  view: ViewDefinition
}

export function TaskFieldConfigDialog({ open, onOpenChange, view }: TaskFieldConfigDialogProps) {
  const fields = useTaskStore((state) => state.fields)
  const updateView = useTaskStore((state) => state.updateView)
  const defaultView = DEFAULT_VIEWS.find((item) => item.id === view.id) ?? DEFAULT_VIEWS.find((item) => item.type === view.type) ?? view

  if (!open) return null

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <section className="task-dialog" aria-label="字段管理" onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>字段管理</h2><button type="button" onClick={() => onOpenChange(false)}>×</button></header>
        <div className="task-field-list">
          {fields.map((field) => (
            <label key={String(field.id)} className="task-field-list__item">
              <input
                checked={view.visibleFieldIds.includes(String(field.id))}
                disabled={field.id === 'title'}
                type="checkbox"
                onChange={(event) => void updateView(setVisibleField(view, String(field.id), event.target.checked)).catch(console.error)}
              />
              <span>{field.name}</span>
            </label>
          ))}
        </div>
        <footer>
          <button type="button" onClick={() => void updateView(resetColumnWidths(view, defaultView)).catch(console.error)}>重置列宽</button>
          <button type="button" onClick={() => onOpenChange(false)}>完成</button>
        </footer>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Add dialog CSS**

Append to `src/components/multiview/styles.css`:

```css
.task-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(15, 23, 42, 0.22);
  padding-top: 12vh;
}

.task-dialog {
  width: min(460px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  padding: 16px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.18);
}

.task-dialog header,
.task-dialog footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-dialog h2 {
  margin: 0;
  font-size: 18px;
}

.task-dialog label,
.task-field-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-dialog input,
.task-dialog select {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}

.task-dialog button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  padding: 8px 12px;
  cursor: pointer;
  font: inherit;
}

.task-dialog footer button:last-child {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.task-field-list__item {
  flex-direction: row !important;
  align-items: center;
}
```

- [ ] **Step 6: Run build**

Run:

```bash
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run build
```

Expected: PASS. If `dist/index.html` changes, run `git restore -- dist/index.html`.

- [ ] **Step 7: Run tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/multiview/TaskFilterDialog.tsx src/components/multiview/TaskSortDialog.tsx src/components/multiview/TaskGroupDialog.tsx src/components/multiview/TaskFieldConfigDialog.tsx src/components/multiview/TaskCommandBar.tsx src/components/multiview/TaskFilterChips.tsx src/components/multiview/TaskToolbar.tsx src/components/multiview/styles.css
git commit -m "feat: add pxcharts-style view controls"
```

---

## Task 6: Add Search to Prepared Task Pipeline

**Files:**
- Modify: `src/tasks/types.ts`
- Modify: `src/tasks/localJsonStore.ts`
- Modify: `src/tasks/store.ts`
- Modify: `src/components/multiview/TaskCommandBar.tsx`
- Modify: `tests/taskLocalJsonStore.test.ts`
- Modify: `tests/taskStore.test.ts`

- [ ] **Step 1: Add failing tests for view search persistence and filtering**

Add to `tests/taskLocalJsonStore.test.ts`:

```ts
test('normalizeTaskData keeps view search query strings', () => {
  const normalized = normalizeTaskData({
    views: [{ id: 'grid-default', name: 'Grid', type: 'grid', visibleFieldIds: ['title'], filters: [], sorts: [], searchQuery: 'ship' }],
    ui: { activeViewId: 'grid-default' },
  })

  assert.equal(normalized.views[0].searchQuery, 'ship')
})
```

Add to `tests/taskStore.test.ts`:

```ts
test('getPreparedTasks filters by view search query', async () => {
  await resetStore({
    tasks: [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Ship search feature', description: 'needle' },
    ],
    views: [{ ...customView, searchQuery: 'needle' }],
    ui: { activeViewId: 'custom-view' },
  })

  const tasks = useTaskStore.getState().getPreparedTasks('custom-view')

  assert.deepEqual(tasks.map((task) => task.id), ['task-2'])
})
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm test -- tests/taskLocalJsonStore.test.ts tests/taskStore.test.ts
```

Expected: FAIL because `searchQuery` is not part of `ViewDefinition` and not applied.

- [ ] **Step 3: Extend view type and normalization**

In `src/tasks/types.ts`, add to `ViewDefinition`:

```ts
  searchQuery?: string
```

In `src/tasks/localJsonStore.ts`, add to the object returned by `normalizeView`:

```ts
    ...(typeof value.searchQuery === 'string' ? { searchQuery: value.searchQuery } : {}),
```

In `cloneViews`, add:

```ts
    ...(typeof view.searchQuery === 'string' ? { searchQuery: view.searchQuery } : {}),
```

- [ ] **Step 4: Apply search in store prepared tasks**

In `src/tasks/store.ts`, add helper near `cloneView`:

```ts
function applySearch(tasks: Task[], query: string | undefined): Task[] {
  const normalized = query?.trim().toLocaleLowerCase()
  if (!normalized) {
    return tasks
  }

  return tasks.filter((task) =>
    [task.title, task.description, task.status, task.priority, task.dueDate]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalized)
  )
}
```

Change `getPreparedTasks` result calculation to:

```ts
    const result = applySorts(applyFilters(applySearch(state.tasks, view.searchQuery), view.filters), view.sorts)
```

- [ ] **Step 5: Wire search input to view config**

In `src/components/multiview/TaskCommandBar.tsx`, replace local `query` state with `view.searchQuery` and `updateView`:

```tsx
  const updateView = useTaskStore((state) => state.updateView)
  const query = view.searchQuery ?? ''
```

Change the search input:

```tsx
        value={query}
        onChange={(event) => void updateView({ ...view, searchQuery: event.target.value }).catch(console.error)}
```

- [ ] **Step 6: Run targeted tests**

Run:

```bash
npm test -- tests/taskLocalJsonStore.test.ts tests/taskStore.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tasks/types.ts src/tasks/localJsonStore.ts src/tasks/store.ts src/components/multiview/TaskCommandBar.tsx tests/taskLocalJsonStore.test.ts tests/taskStore.test.ts
git commit -m "feat: add view search pipeline"
```

---

## Task 7: Browser Performance and UI Verification

**Files:**
- Modify only files needed to fix verification failures.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
$env:NODE_OPTIONS='--max-old-space-size=4096'; npm run build
```

Expected: PASS. If `dist/index.html` changes, run:

```bash
git restore -- dist/index.html
```

- [ ] **Step 3: Start dev server**

Run:

```powershell
$out = Join-Path $env:TEMP 'todo-pxcharts-redesign.out.log'
$err = Join-Path $env:TEMP 'todo-pxcharts-redesign.err.log'
Remove-Item -LiteralPath $out,$err -Force -ErrorAction SilentlyContinue
Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev','--','--host','127.0.0.1','--port','5173') -WorkingDirectory 'C:/Users/89434/work/code/todo/todo-with-agent' -WindowStyle Hidden -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
```

Expected: Vite listens at `http://127.0.0.1:5173/`.

- [ ] **Step 4: Verify empty-task switching**

In browser console or DevTools evaluate:

```js
window.__taskStore.getState().tasks.length
```

If it is not zero, temporarily clear memory for the browser verification:

```js
window.__taskStore.setState({ tasks: [], selectedTaskId: undefined, activeViewId: 'grid-default' })
```

Click Grid, Kanban, Calendar, and Grid again.

Expected:

- No visible long pause.
- No React maximum-depth error.
- Command bar and sidebar remain stable.

- [ ] **Step 5: Record empty switch trace**

Use Chrome DevTools performance trace around Grid → Kanban → Calendar → Grid.

Expected:

- No interaction waits on JSON file reads/writes.
- If INP is reported, it should remain low for empty task state.

- [ ] **Step 6: Verify large-data behavior**

Inject 5,000 tasks in browser memory:

```js
const store = window.__taskStore
const statuses = ['todo', 'doing', 'done', 'blocked']
const priorities = ['urgent', 'high', 'medium', 'low']
const now = new Date().toISOString()
store.setState({
  tasks: Array.from({ length: 5000 }, (_, i) => ({
    id: `perf-${i}`,
    title: `性能测试任务 ${i + 1}`,
    status: statuses[i % statuses.length],
    priority: priorities[i % priorities.length],
    tagIds: [],
    dueDate: `2026-04-${String((i % 28) + 1).padStart(2, '0')}`,
    description: `用于测试表格性能的任务 ${i + 1}`,
    createdAt: new Date(Date.now() - i * 1000).toISOString(),
    updatedAt: now,
  })),
  activeViewId: 'grid-default',
})
```

Verify:

- Grid remains usable because Glide virtualizes rows.
- Kanban may be slower with thousands of cards. If it renders thousands of DOM nodes, document the limitation in the final response and keep large data guidance toward Grid.

- [ ] **Step 7: Verify multidimensional controls**

Manual browser checks:

- Search filters visible records.
- Filter dialog adds a rule and chip appears.
- Clicking a filter chip removes the rule.
- Sort dialog updates sort chip.
- Group dialog changes Kanban grouping.
- Field dialog hides and restores a grid column.
- New task creates a visible record.
- Detail panel still opens and edits title/status/priority/tags/due date.
- Agent chat launcher remains visible.

- [ ] **Step 8: Commit any fixes**

If verification required code changes:

```bash
git add src tests
git commit -m "fix: stabilize pxcharts-style task workspace"
```

If no fixes were needed, do not create an empty commit.

---

## Self-Review

Spec coverage:

- pxcharts-style left navigation: Task 3.
- pxcharts-style command bar: Task 4.
- Rule-based filtering and chips: Tasks 1, 4, and 5.
- Sort/group/field dialogs: Task 5.
- Non-blocking view state persistence: Task 2.
- Search: Task 6.
- Preserve task model, storage, and tools: all tasks avoid replacing domain modules; Task 7 verifies agent chat.
- Browser/performance verification: Task 7.

Placeholder scan:

- No `TBD`, unresolved `TODO`, or unspecified implementation steps remain.

Type consistency:

- `ViewDefinition`, `FilterRule`, and `SortRule` names match existing task types.
- Dialog components receive `view: ViewDefinition`.
- Store methods remain `setActiveView`, `updateView`, `getPreparedTasks`, and `createTask`.

Risk notes:

- Task 4 temporarily creates imports for dialog components that Task 5 provides; implement these two tasks in sequence.
- Search persistence adds `searchQuery` to view definitions while keeping `TaskAppData` version `1`; normalization remains backward compatible.
- Large Kanban performance may still be bounded by DOM size. Task 7 requires measuring and documenting that if not fully fixed.
