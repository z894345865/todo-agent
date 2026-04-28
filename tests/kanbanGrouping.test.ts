import test from 'node:test'
import assert from 'node:assert/strict'
import { getKanbanTaskPatch } from '../src/components/multiview/kanbanGrouping.ts'
import { createTask } from '../src/tasks/model.ts'

test('getKanbanTaskPatch replaces source tag when moving between tag groups', () => {
  const task = createTask({ title: 'Tagged task', tagIds: ['ai'] }, '2026-04-28T12:00:00.000Z')

  const patch = getKanbanTaskPatch(task, { groupBy: 'tagIds', groupValue: 'optics' }, { groupBy: 'tagIds', groupValue: 'ai' })

  assert.deepEqual(patch, { tagIds: ['optics'] })
})

test('getKanbanTaskPatch replaces all tags when moving from one tag group to another', () => {
  const task = createTask({ title: 'Tagged task', tagIds: ['ai', 'paper'] }, '2026-04-28T12:00:00.000Z')

  const patch = getKanbanTaskPatch(task, { groupBy: 'tagIds', groupValue: 'optics' }, { groupBy: 'tagIds', groupValue: 'ai' })

  assert.deepEqual(patch, { tagIds: ['optics'] })
})

test('getKanbanTaskPatch clears tags when dropping into the empty tag group', () => {
  const task = createTask({ title: 'Tagged task', tagIds: ['ai', 'paper'] }, '2026-04-28T12:00:00.000Z')

  const patch = getKanbanTaskPatch(task, { groupBy: 'tagIds', groupValue: 'none' }, { groupBy: 'tagIds', groupValue: 'ai' })

  assert.deepEqual(patch, { tagIds: [] })
})

test('getKanbanTaskPatch ignores no-op moves', () => {
  const task = createTask({ title: 'Tagged task', status: 'todo', priority: 'high', tagIds: ['ai'] }, '2026-04-28T12:00:00.000Z')

  assert.equal(getKanbanTaskPatch(task, { groupBy: 'status', groupValue: 'todo' }), undefined)
  assert.equal(getKanbanTaskPatch(task, { groupBy: 'priority', groupValue: 'high' }), undefined)
  assert.equal(getKanbanTaskPatch(task, { groupBy: 'tagIds', groupValue: 'ai' }, { groupBy: 'tagIds', groupValue: 'ai' }), undefined)
})
