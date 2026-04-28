import test from 'node:test'
import assert from 'node:assert/strict'
import { todoTools } from '../src/agent/tools.ts'
import { __resetTaskDataForTests } from '../src/tasks/db.ts'
import { useTaskStore } from '../src/tasks/store.ts'

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

test('list_tasks filters tasks by status', async () => {
  await resetTaskStore()

  const active = await useTaskStore.getState().createTask({ title: 'Active tool test', status: 'doing' })
  const completed = await useTaskStore.getState().createTask({ title: 'Completed tool test' })
  await useTaskStore.getState().completeTask(completed.id)

  const activeList = await todoTools.list_tasks.execute({ status: 'doing' })
  const completedList = await todoTools.list_tasks.execute({ status: 'done' })

  assert.match(activeList, new RegExp(active.id))
  assert.doesNotMatch(activeList, new RegExp(completed.id))
  assert.match(completedList, new RegExp(completed.id))
  assert.doesNotMatch(completedList, new RegExp(active.id))
})

test('list_tasks filters tasks by priority', async () => {
  await resetTaskStore()

  const high = await useTaskStore.getState().createTask({ title: 'High priority tool test', priority: 'high' })
  const low = await useTaskStore.getState().createTask({ title: 'Low priority tool test', priority: 'low' })

  const highList = await todoTools.list_tasks.execute({ priority: 'high' })

  assert.match(highList, new RegExp(high.id))
  assert.doesNotMatch(highList, new RegExp(low.id))
  assert.match(highList, /priority: high/)
})

test('create_task creates task and tags when tags are supplied', async () => {
  await resetTaskStore()

  const result = await todoTools.create_task.execute({
    title: 'Tagged tool test',
    tags: ['work', 'agent'],
    priority: 'urgent',
  })

  const task = useTaskStore.getState().tasks[0]
  const tags = useTaskStore.getState().tags
  assert.match(result, /Created task/)
  assert.equal(task.title, 'Tagged tool test')
  assert.equal(task.priority, 'urgent')
  assert.deepEqual(
    tags.map((tag) => tag.name),
    ['work']
  )
  assert.deepEqual(task.tagIds, tags.map((tag) => tag.id))
})

test('list_tasks filters tasks by tag', async () => {
  await resetTaskStore()

  const taggedResult = await todoTools.create_task.execute({ title: 'Tagged list test', tags: ['work'] })
  const untagged = await useTaskStore.getState().createTask({ title: 'Untagged list test' })

  const taggedList = await todoTools.list_tasks.execute({ tags: ['work'] })

  assert.match(taggedList, /Tagged list test/)
  assert.match(taggedList, /tag: work/)
  assert.match(taggedResult, /tag: work/)
  assert.doesNotMatch(taggedList, new RegExp(untagged.id))
})

test('complete_task marks task done', async () => {
  await resetTaskStore()
  const task = await useTaskStore.getState().createTask({ title: 'Finish compatibility tests' })

  const result = await todoTools.complete_task.execute({ id: task.id })

  const updatedTask = useTaskStore.getState().tasks.find((item) => item.id === task.id)
  assert.match(result, /Completed task/)
  assert.equal(updatedTask?.status, 'done')
})
