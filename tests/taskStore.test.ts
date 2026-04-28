import test from 'node:test'
import assert from 'node:assert/strict'
import { __resetTaskDataForTests } from '../src/tasks/db.ts'
import { DEFAULT_VIEWS } from '../src/tasks/defaults.ts'
import { useTaskStore } from '../src/tasks/store.ts'
import type { Tag, Task, ViewDefinition } from '../src/tasks/types.ts'

const baseTask: Task = {
  id: 'task-1',
  title: 'Write store tests',
  status: 'todo',
  priority: 'medium',
  tagIds: [],
  createdAt: '2026-04-27T12:00:00.000Z',
  updatedAt: '2026-04-27T12:00:00.000Z',
}

const customView: ViewDefinition = {
  id: 'custom-view',
  name: 'Custom view',
  type: 'grid',
  visibleFieldIds: ['title', 'status'],
  filters: [],
  sorts: [],
  columnWidths: {
    title: 320,
  },
}

type Deferred<T> = {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

type ResetStoreData = {
  tasks: Task[]
  tags?: Tag[]
  views: ViewDefinition[]
  ui: {
    activeViewId: string
  }
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

async function resetStore(data: ResetStoreData = { tasks: [baseTask], views: [customView], ui: { activeViewId: 'custom-view' } }) {
  await __resetTaskDataForTests({
    version: 1,
    tasks: data.tasks,
    tags: data.tags ?? [],
    fields: [],
    views: data.views,
    ui: data.ui,
  })
  useTaskStore.setState({
    tasks: [],
    tags: [],
    fields: [],
    views: [],
    activeViewId: 'grid-default',
    selectedTaskId: undefined,
    loading: false,
    error: null,
  })
  await useTaskStore.getState().init()
}

test('concurrent updateTask calls preserve changes to different fields', async () => {
  await resetStore()

  await Promise.all([
    useTaskStore.getState().updateTask(baseTask.id, { title: 'Renamed task' }),
    useTaskStore.getState().updateTask(baseTask.id, { priority: 'high' }),
  ])

  const task = useTaskStore.getState().tasks.find((item) => item.id === baseTask.id)
  assert.equal(task?.title, 'Renamed task')
  assert.equal(task?.priority, 'high')
})

test('setActiveView normalizes empty ids back to the default view', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'kanban-status' } })

  await useTaskStore.getState().setActiveView('')

  assert.equal(useTaskStore.getState().activeViewId, 'grid-default')
})

test('setActiveView falls back to the first available view when default grid is missing', async () => {
  await resetStore()

  await useTaskStore.getState().setActiveView('')

  assert.equal(useTaskStore.getState().activeViewId, 'custom-view')
})

test('setActiveView updates memory before persistence finishes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })

  const promise = useTaskStore.getState().setActiveView('kanban-status')

  assert.equal(useTaskStore.getState().activeViewId, 'kanban-status')
  await promise
  assert.equal(useTaskStore.getState().activeViewId, 'kanban-status')
})

test('setActiveView keeps newer memory state when older persistence completes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })
  const originalFetch = globalThis.fetch
  const writes = [createDeferred<Response>(), createDeferred<Response>()]
  let writeIndex = 0
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === '/__task_data' && init?.method === 'PUT') {
      return writes[writeIndex++].promise
    }
    return Promise.resolve(new Response(null, { status: 404 }))
  }) as typeof fetch

  try {
    const first = useTaskStore.getState().setActiveView('kanban-status')
    const second = useTaskStore.getState().setActiveView('calendar-due-date')

    assert.equal(useTaskStore.getState().activeViewId, 'calendar-due-date')
    writes[0].resolve(new Response(null, { status: 204 }))
    await flushMicrotasks()
    assert.equal(useTaskStore.getState().activeViewId, 'calendar-due-date')

    writes[1].resolve(new Response(null, { status: 204 }))
    await Promise.all([first, second])
    assert.equal(useTaskStore.getState().activeViewId, 'calendar-due-date')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('setSelectedTask clears unknown task ids', async () => {
  await resetStore()

  await useTaskStore.getState().setSelectedTask('missing')

  assert.equal(useTaskStore.getState().selectedTaskId, undefined)
})

test('getPreparedTasks returns a stable reference while task and view state is unchanged', async () => {
  await resetStore()

  const first = useTaskStore.getState().getPreparedTasks('custom-view')
  const second = useTaskStore.getState().getPreparedTasks('custom-view')

  assert.equal(second, first)
})

test('getPreparedTasks filters by view search query and keeps cache stable', async () => {
  await resetStore({
    tasks: [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Ship search feature', description: 'needle' },
    ],
    views: [{ ...customView, searchQuery: 'needle' }],
    ui: { activeViewId: 'custom-view' },
  })

  const first = useTaskStore.getState().getPreparedTasks('custom-view')
  const second = useTaskStore.getState().getPreparedTasks('custom-view')

  assert.deepEqual(first.map((task) => task.id), ['task-2'])
  assert.equal(second, first)
})

test('getPreparedTasks filters by tag name search query', async () => {
  await resetStore({
    tasks: [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Tagged task', tagIds: ['tag-ship'] },
    ],
    tags: [{ id: 'tag-ship', name: 'Release', color: '#2563eb' }],
    views: [{ ...customView, searchQuery: 'release' }],
    ui: { activeViewId: 'custom-view' },
  })

  const tasks = useTaskStore.getState().getPreparedTasks('custom-view')

  assert.deepEqual(tasks.map((task) => task.id), ['task-2'])
})

test('clearing view search query restores prepared tasks', async () => {
  await resetStore({
    tasks: [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Ship search feature', description: 'needle' },
    ],
    views: [{ ...customView, searchQuery: 'needle' }],
    ui: { activeViewId: 'custom-view' },
  })

  assert.deepEqual(
    useTaskStore
      .getState()
      .getPreparedTasks('custom-view')
      .map((task) => task.id),
    ['task-2']
  )

  await useTaskStore.getState().updateView({ ...customView, searchQuery: '' })

  assert.deepEqual(
    useTaskStore
      .getState()
      .getPreparedTasks('custom-view')
      .map((task) => task.id),
    ['task-1', 'task-2']
  )
})

test('setViewSearchQuery updates memory immediately without dropping other view config', async () => {
  await resetStore({
    tasks: [
      baseTask,
      { ...baseTask, id: 'task-2', title: 'Ship search feature', description: 'needle' },
    ],
    views: [{ ...customView, filters: [{ fieldId: 'status', operator: 'is', value: 'todo' }], sorts: [{ fieldId: 'title', direction: 'asc' }] }],
    ui: { activeViewId: 'custom-view' },
  })

  useTaskStore.getState().setViewSearchQuery('custom-view', 'needle')

  const view = useTaskStore.getState().views.find((item) => item.id === 'custom-view')!
  assert.equal(view.searchQuery, 'needle')
  assert.deepEqual(view.filters, [{ fieldId: 'status', operator: 'is', value: 'todo' }])
  assert.deepEqual(view.sorts, [{ fieldId: 'title', direction: 'asc' }])
  assert.deepEqual(
    useTaskStore
      .getState()
      .getPreparedTasks('custom-view')
      .map((task) => task.id),
    ['task-2']
  )
})

test('updateView stores a cloned normalized view result', async () => {
  await resetStore()
  const view: ViewDefinition = {
    ...customView,
    name: 'Updated custom view',
    visibleFieldIds: [...customView.visibleFieldIds],
    filters: [],
    sorts: [],
    columnWidths: { title: 420 },
  }

  await useTaskStore.getState().updateView(view)
  view.name = 'Mutated after update'
  view.visibleFieldIds.push('priority')
  view.columnWidths!.title = 999

  const storedView = useTaskStore.getState().views.find((item) => item.id === view.id)
  assert.equal(storedView?.name, 'Updated custom view')
  assert.deepEqual(storedView?.visibleFieldIds, ['title', 'status'])
  assert.equal(storedView?.columnWidths?.title, 420)
})

test('updateView updates memory before persistence finishes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })
  const view = useTaskStore.getState().views.find((item) => item.id === 'grid-default')!

  const promise = useTaskStore.getState().updateView({ ...view, name: 'Fast Grid' })

  assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Fast Grid')
  await promise
  assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Fast Grid')
})

test('updateView keeps newer memory state when older persistence completes', async () => {
  await resetStore({ tasks: [baseTask], views: DEFAULT_VIEWS, ui: { activeViewId: 'grid-default' } })
  const originalFetch = globalThis.fetch
  const writes = [createDeferred<Response>(), createDeferred<Response>()]
  let writeIndex = 0
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input) === '/__task_data' && init?.method === 'PUT') {
      return writes[writeIndex++].promise
    }
    return Promise.resolve(new Response(null, { status: 404 }))
  }) as typeof fetch

  try {
    const view = useTaskStore.getState().views.find((item) => item.id === 'grid-default')!
    const first = useTaskStore.getState().updateView({ ...view, name: 'First Grid' })
    const second = useTaskStore.getState().updateView({ ...view, name: 'Second Grid' })

    assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Second Grid')
    writes[0].resolve(new Response(null, { status: 204 }))
    await flushMicrotasks()
    assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Second Grid')

    writes[1].resolve(new Response(null, { status: 204 }))
    await Promise.all([first, second])
    assert.equal(useTaskStore.getState().views.find((item) => item.id === 'grid-default')?.name, 'Second Grid')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('createTag rejects empty names and sets store error', async () => {
  await resetStore()

  await assert.rejects(() => useTaskStore.getState().createTag('   '), /tag name is required/i)
  assert.match(useTaskStore.getState().error ?? '', /tag name is required/i)
})

test('throwing external listeners do not block later listeners or reject successful mutations', async () => {
  await resetStore()
  let secondListenerCalled = false
  const unsubscribeFirst = useTaskStore.getState().subscribeExternal(() => {
    throw new Error('listener failed')
  })
  const unsubscribeSecond = useTaskStore.getState().subscribeExternal(() => {
    secondListenerCalled = true
  })

  try {
    await useTaskStore.getState().createTask({ id: 'task-2', title: 'Notify listeners' })
  } finally {
    unsubscribeFirst()
    unsubscribeSecond()
  }

  assert.equal(secondListenerCalled, true)
  assert.equal(useTaskStore.getState().tasks.some((task) => task.id === 'task-2'), true)
})
