import test from 'node:test'
import assert from 'node:assert/strict'
import { createTask, getTaskSummary, groupTasks, normalizeTask } from '../src/tasks/model.ts'
import { DEFAULT_FIELDS, DEFAULT_VIEWS } from '../src/tasks/defaults.ts'
import type { Task } from '../src/tasks/types.ts'

test('DEFAULT_FIELDS has required title field', () => {
  assert.ok(DEFAULT_FIELDS.some((field) => field.id === 'title' && field.required))
})

test('DEFAULT_VIEWS types are grid, kanban, and calendar', () => {
  assert.deepEqual(DEFAULT_VIEWS.map((view) => view.type), ['grid', 'kanban', 'calendar'])
})

test('createTask creates default status, default tags, requested priority, and timestamps', () => {
  const task = createTask({ title: 'Write plan', priority: 'high' }, '2026-04-27T12:00:00.000Z')

  assert.equal(task.title, 'Write plan')
  assert.equal(task.status, 'todo')
  assert.equal(task.priority, 'high')
  assert.deepEqual(task.tagIds, [])
  assert.equal(task.createdAt, '2026-04-27T12:00:00.000Z')
  assert.equal(task.updatedAt, '2026-04-27T12:00:00.000Z')
})

test('normalizeTask rejects empty titles and invalid dueDate strings', () => {
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

test('getTaskSummary counts total, active, completed, overdue, and dueToday', () => {
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
