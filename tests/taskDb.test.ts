import test from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetTaskDataForTests,
  addTaskRecord,
  deleteTaskRecord,
  getAllTaskRecords,
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
