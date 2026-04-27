import test from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetTaskDataForTests,
  addTaskRecord,
  deleteTaskRecord,
  getAllTaskRecords,
  getTaskData,
  setActiveViewId,
  updateTaskRecord,
} from '../src/tasks/db.ts'
import type { Task } from '../src/tasks/types.ts'

const firstTask: Task = {
  id: 'task-1',
  title: 'Write storage tests',
  status: 'todo',
  priority: 'medium',
  tagIds: [],
  createdAt: '2026-04-27T12:00:00.000Z',
  updatedAt: '2026-04-27T12:00:00.000Z',
}

test('task db stores, updates, and deletes records', async () => {
  await __resetTaskDataForTests()

  await addTaskRecord(firstTask)
  assert.deepEqual(await getAllTaskRecords(), [firstTask])

  const updated = { ...firstTask, title: 'Ship storage tests', status: 'doing' as const }
  await updateTaskRecord(updated)
  assert.deepEqual(await getAllTaskRecords(), [updated])

  await deleteTaskRecord(firstTask.id)
  assert.deepEqual(await getAllTaskRecords(), [])
})

test('task db returns cloned task records', async () => {
  await __resetTaskDataForTests()
  await addTaskRecord(firstTask)

  const records = await getAllTaskRecords()
  records[0].title = 'Mutated outside storage'
  records[0].tagIds.push('tag-1')

  assert.deepEqual(await getAllTaskRecords(), [firstTask])
})

test('task db exposes normalized cache immediately after saving', async () => {
  await __resetTaskDataForTests()

  await setActiveViewId('')

  assert.equal((await getTaskData()).ui.activeViewId, 'grid-default')
})

test('task db writes task-shaped data to the dev server endpoint outside Tauri', async () => {
  await __resetTaskDataForTests()
  const originalFetch = globalThis.fetch
  let endpoint = ''
  let method = ''
  let body = ''

  globalThis.fetch = async (input, init) => {
    endpoint = String(input)
    method = init?.method ?? 'GET'
    body = String(init?.body)
    return new Response(null, { status: 204 })
  }

  try {
    await addTaskRecord(firstTask)
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.equal(endpoint, '/__task_data')
  assert.equal(method, 'PUT')
  assert.equal(JSON.parse(body).tasks[0].title, firstTask.title)
  assert.equal(JSON.parse(body).ui.activeViewId, 'grid-default')
})

test('task db reads task-shaped data from the dev server endpoint outside Tauri', async () => {
  await __resetTaskDataForTests(null)
  const originalFetch = globalThis.fetch

  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/__task_data')
    assert.equal(init?.headers?.['Accept'], 'application/json')
    return new Response(
      JSON.stringify({
        tasks: [{ ...firstTask, title: 'Persisted from dev file' }],
        ui: { activeViewId: 'missing-view' },
      })
    )
  }

  try {
    const data = await getTaskData()

    assert.equal(data.tasks[0].title, 'Persisted from dev file')
    assert.equal(data.ui.activeViewId, 'grid-default')
  } finally {
    globalThis.fetch = originalFetch
  }
})
