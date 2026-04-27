import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyTaskData, normalizeTaskData } from '../src/tasks/localJsonStore.ts'

test('createEmptyTaskData includes version, defaults, and empty records', () => {
  const data = createEmptyTaskData()

  assert.equal(data.version, 1)
  assert.deepEqual(data.tasks, [])
  assert.deepEqual(data.tags, [])
  assert.ok(data.fields.some((field) => field.id === 'title' && field.required))
  assert.deepEqual(data.views.map((view) => view.type), ['grid', 'kanban', 'calendar'])
  assert.equal(data.ui.activeViewId, 'grid-default')
  assert.equal(data.ui.selectedTaskId, undefined)
})

test('normalizeTaskData rejects non-object root', () => {
  assert.throws(() => normalizeTaskData(null), /task data root must be an object/)
})

test('normalizeTaskData keeps valid tasks and fills missing tags and default UI', () => {
  const normalized = normalizeTaskData({
    tasks: [
      {
        id: 'task-1',
        title: 'Ship task storage',
        status: 'doing',
        priority: 'high',
        createdAt: '2026-04-27T12:00:00.000Z',
        updatedAt: '2026-04-27T12:30:00.000Z',
      },
    ],
  })

  assert.equal(normalized.version, 1)
  assert.equal(normalized.tasks.length, 1)
  assert.equal(normalized.tasks[0].id, 'task-1')
  assert.equal(normalized.tasks[0].title, 'Ship task storage')
  assert.deepEqual(normalized.tasks[0].tagIds, [])
  assert.deepEqual(normalized.tags, [])
  assert.ok(normalized.fields.some((field) => field.id === 'status'))
  assert.deepEqual(normalized.views.map((view) => view.type), ['grid', 'kanban', 'calendar'])
  assert.equal(normalized.ui.activeViewId, 'grid-default')
})
