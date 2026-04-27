import test from 'node:test'
import assert from 'node:assert/strict'
import { __resetTaskDataForTests } from '../src/tasks/db.ts'
import { useTaskStore } from '../src/tasks/store.ts'
import type { Task, ViewDefinition } from '../src/tasks/types.ts'

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

async function resetStore(data = { tasks: [baseTask], views: [customView], ui: { activeViewId: 'custom-view' } }) {
  await __resetTaskDataForTests({
    version: 1,
    tasks: data.tasks,
    tags: [],
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
  await resetStore()

  await useTaskStore.getState().setActiveView('')

  assert.equal(useTaskStore.getState().activeViewId, 'grid-default')
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
