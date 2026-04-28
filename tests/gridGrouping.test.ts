import assert from 'node:assert/strict'
import test from 'node:test'
import { createGridRows } from '../src/components/multiview/gridGrouping.ts'
import { createTask } from '../src/tasks/model.ts'
import type { Tag } from '../src/tasks/types.ts'

const tags: Tag[] = [
  { id: 'tag-product', name: '产品', color: '#2563eb' },
  { id: 'tag-design', name: '设计', color: '#db2777' },
]

test('createGridRows returns plain task rows when grid grouping is disabled', () => {
  const tasks = [createTask({ id: 'task-1', title: '写方案', status: 'todo' }, '2026-04-28')]

  const rows = createGridRows(tasks, undefined, tags)

  assert.deepEqual(
    rows.map((row) => row.kind),
    ['task']
  )
  assert.equal(rows[0]?.kind === 'task' ? rows[0].task.id : undefined, 'task-1')
})

test('createGridRows groups table rows by status with header rows and counts', () => {
  const tasks = [
    createTask({ id: 'task-1', title: '写方案', status: 'todo' }, '2026-04-28'),
    createTask({ id: 'task-2', title: '做原型', status: 'doing' }, '2026-04-28'),
    createTask({ id: 'task-3', title: '评审', status: 'todo' }, '2026-04-28'),
  ]

  const rows = createGridRows(tasks, 'status', tags)

  assert.deepEqual(
    rows.map((row) => (row.kind === 'group' ? `${row.label}:${row.count}` : row.task.id)),
    ['待办:2', 'task-1', 'task-3', '进行中:1', 'task-2']
  )
})

test('createGridRows groups table rows by tag and includes untagged tasks', () => {
  const tasks = [
    createTask({ id: 'task-1', title: '写方案', tagIds: ['tag-product'] }, '2026-04-28'),
    createTask({ id: 'task-2', title: '整理收件箱', tagIds: [] }, '2026-04-28'),
    createTask({ id: 'task-3', title: '做原型', tagIds: ['tag-design'] }, '2026-04-28'),
  ]

  const rows = createGridRows(tasks, 'tagIds', tags)

  assert.deepEqual(
    rows.map((row) => (row.kind === 'group' ? `${row.label}:${row.count}` : row.task.id)),
    ['产品:1', 'task-1', '设计:1', 'task-3', '无标签:1', 'task-2']
  )
})
