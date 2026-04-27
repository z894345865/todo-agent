import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createEmptyData,
  normalizeData,
  calculateTodoStats,
  type TodoDataFile,
} from '../src/db/localJsonStore.ts'

test('normalizeData fills missing collections and keeps valid records', () => {
  const normalized = normalizeData({
    todos: [{ id: '1', text: 'Ship', completed: false, createdAt: 1 }],
  })

  assert.equal(normalized.version, 1)
  assert.equal(normalized.todos.length, 1)
  assert.deepEqual(normalized.tags, [])
  assert.deepEqual(normalized.todoTags, [])
  assert.deepEqual(normalized.ui.filters, {})
})

test('normalizeData rejects a non-object root', () => {
  assert.throws(() => normalizeData(null), /data file root must be an object/)
})

test('normalizeData rejects invalid collections', () => {
  assert.throws(() => normalizeData({ todos: {}, tags: [], todoTags: [] }), /todos must be an array/)
})

test('normalizeData repairs legacy mojibake filter values', () => {
  const normalized = normalizeData({
    ui: {
      filters: {
        priority: '鍏ㄩ儴',
        status: '全锟斤拷',
        tag: 'È«ï¿½ï¿½',
      },
    },
  })

  assert.equal(normalized.ui.filters.priority, '全部')
  assert.equal(normalized.ui.filters.status, '全部')
  assert.equal(normalized.ui.filters.tag, '全部')
})

test('calculateTodoStats derives totals from todos', () => {
  const data: TodoDataFile = createEmptyData()
  data.todos.push(
    { id: '1', text: 'Done', completed: true, createdAt: 1, completedAt: Date.now(), priority: 'high' },
    { id: '2', text: 'Late', completed: false, createdAt: 1, dueDate: Date.now() - 1000, priority: 'low' },
  )

  const stats = calculateTodoStats(data.todos)

  assert.equal(stats.total, 2)
  assert.equal(stats.completed, 1)
  assert.equal(stats.completionRate, 50)
  assert.equal(stats.priorityStats.high, 1)
  assert.equal(stats.priorityStats.low, 1)
  assert.equal(stats.overdueCount, 1)
})
