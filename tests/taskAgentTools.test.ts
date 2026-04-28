import test from 'node:test'
import assert from 'node:assert/strict'
import { __resetTaskDataForTests } from '../src/tasks/db.ts'
import { useTaskStore } from '../src/tasks/store.ts'
import { taskTools } from '../src/tasks/agentTools.ts'

async function resetTaskStore() {
  await __resetTaskDataForTests()
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

test('create_task creates structured task and list_tasks returns it with created tags', async () => {
  await resetTaskStore()

  const createResult = await taskTools.create_task.execute({
    title: 'Plan multiview tools',
    status: 'doing',
    priority: 'high',
    dueDate: '2026-05-01',
    tags: ['agent', 'multiview'],
    description: 'Rewrite agent tools for task store',
  })
  const listResult = await taskTools.list_tasks.execute({})

  const task = useTaskStore.getState().tasks[0]
  const tags = useTaskStore.getState().tags
  assert.match(createResult, /Created task/)
  assert.equal(task.title, 'Plan multiview tools')
  assert.equal(task.status, 'doing')
  assert.equal(task.priority, 'high')
  assert.equal(task.dueDate, '2026-05-01')
  assert.equal(task.description, 'Rewrite agent tools for task store')
  assert.deepEqual(
    tags.map((tag) => tag.name),
    ['agent', 'multiview']
  )
  assert.deepEqual(task.tagIds, tags.map((tag) => tag.id))
  assert.match(listResult, /Plan multiview tools/)
  assert.match(listResult, /agent, multiview/)
})

test('complete_task marks task done', async () => {
  await resetTaskStore()
  const task = await useTaskStore.getState().createTask({ title: 'Finish tool rewrite' })

  const result = await taskTools.complete_task.execute({ id: task.id })

  const updatedTask = useTaskStore.getState().tasks.find((item) => item.id === task.id)
  assert.match(result, /Completed task/)
  assert.equal(updatedTask?.status, 'done')
  assert.equal(typeof updatedTask?.completedAt, 'string')
})

test('update_task returns a no-task message for a missing id', async () => {
  await resetTaskStore()

  const result = await taskTools.update_task.execute({ id: 'missing-task', title: 'Nope' })

  assert.equal(result, 'No task found with id: "missing-task"')
})

test('search_tasks matches title, description, and tag names', async () => {
  await resetTaskStore()
  await taskTools.create_task.execute({
    title: 'Write release notes',
    tags: ['docs'],
    description: 'Summarize multiview agent changes',
  })

  assert.match(await taskTools.search_tasks.execute({ query: 'release' }), /Write release notes/)
  assert.match(await taskTools.search_tasks.execute({ query: 'multiview' }), /Write release notes/)
  assert.match(await taskTools.search_tasks.execute({ query: 'docs' }), /Write release notes/)
})

test('required PageAgent tools are registered', () => {
  assert.equal(typeof taskTools.filter_tasks?.execute, 'function')
  assert.equal(typeof taskTools.create_tag?.execute, 'function')
  assert.equal(typeof taskTools.update_view?.execute, 'function')
})

test('filter_tasks returns formatted tasks for structured filters including overdue and limit', async () => {
  await resetTaskStore()
  await taskTools.create_task.execute({
    title: 'Fix blocked production bug',
    status: 'blocked',
    priority: 'urgent',
    dueDate: '2000-01-01',
    tags: ['ops'],
  })
  await taskTools.create_task.execute({
    title: 'Plan quarterly roadmap',
    status: 'doing',
    priority: 'high',
    dueDate: '2999-01-01',
    tags: ['planning'],
  })
  await taskTools.create_task.execute({
    title: 'Document closed incident',
    status: 'done',
    priority: 'urgent',
    dueDate: '2000-01-01',
    tags: ['ops'],
  })

  const result = await taskTools.filter_tasks.execute({
    status: 'blocked',
    priority: 'urgent',
    tags: ['ops'],
    dueDate: '2000-01-01',
    overdue: true,
    limit: 1,
  })

  assert.match(result, /Fix blocked production bug/)
  assert.match(result, /status: blocked/)
  assert.match(result, /priority: urgent/)
  assert.match(result, /due: 2000-01-01/)
  assert.match(result, /tags: ops/)
  assert.doesNotMatch(result, /Plan quarterly roadmap/)
  assert.doesNotMatch(result, /Document closed incident/)
})

test('create_tag creates and reuses tags by name', async () => {
  await resetTaskStore()

  const created = await taskTools.create_tag.execute({ name: 'Customer' })
  const reused = await taskTools.create_tag.execute({ name: ' customer ' })

  assert.match(created, /^Tag: "Customer" \[id: .+\] \| color: #[0-9a-f]{6}$/i)
  assert.equal(reused, created)
  assert.equal(useTaskStore.getState().tags.length, 1)
  assert.equal(useTaskStore.getState().tags[0].name, 'Customer')
})

test('update_view updates the active view and rejects unknown fields', async () => {
  await resetTaskStore()

  const result = await taskTools.update_view.execute({
    filters: [{ fieldId: 'status', operator: 'is', value: 'doing' }],
    sorts: [{ fieldId: 'priority', direction: 'asc' }],
    groupBy: 'status',
    visibleFieldIds: ['title', 'status', 'priority'],
  })

  const view = useTaskStore.getState().views.find((item) => item.id === useTaskStore.getState().activeViewId)
  assert.match(result, /Updated view: "表格" \[id: grid-default\]/)
  assert.deepEqual(view?.filters, [{ fieldId: 'status', operator: 'is', value: 'doing' }])
  assert.deepEqual(view?.sorts, [{ fieldId: 'priority', direction: 'asc' }])
  assert.equal(view?.groupBy, 'status')
  assert.deepEqual(view?.visibleFieldIds, ['title', 'status', 'priority'])

  assert.throws(
    () => taskTools.update_view.inputSchema.parse({ visibleFieldIds: ['title', 'missing-field'] }),
    /Invalid enum value|invalid/i
  )
})

test('get_task_summary returns task totals', async () => {
  await resetTaskStore()
  await useTaskStore.getState().createTask({ title: 'Open task', dueDate: '2026-04-26' })
  const doneTask = await useTaskStore.getState().createTask({ title: 'Done task' })
  await useTaskStore.getState().completeTask(doneTask.id)

  const result = await taskTools.get_task_summary.execute({})

  assert.match(result, /Total: 2/)
  assert.match(result, /Active: 1/)
  assert.match(result, /Completed: 1/)
})

test('task tool schemas reject invalid due dates', () => {
  assert.equal(taskTools.create_task.inputSchema.safeParse({ title: 'Invalid date', dueDate: '2026-2-3' }).success, false)
  assert.equal(taskTools.update_task.inputSchema.safeParse({ id: 'task-1', dueDate: '2026-02-30' }).success, false)
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ dueDate: 'tomorrow' }).success, false)
  assert.equal(taskTools.update_task.inputSchema.safeParse({ id: 'task-1', dueDate: null }).success, true)
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ dueDate: null }).success, true)
})

test('list_tasks schema rejects invalid limits', () => {
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ limit: -1 }).success, false)
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ limit: 1.5 }).success, false)
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ limit: 101 }).success, false)
  assert.equal(taskTools.list_tasks.inputSchema.safeParse({ limit: 100 }).success, true)
})
