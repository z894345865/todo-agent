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

test('default grid view filters to active tasks', () => {
  const data = createEmptyTaskData()
  const gridView = data.views.find((view) => view.id === 'grid-default')

  assert.deepEqual(gridView?.filters, [{ fieldId: 'status', operator: 'isNot', value: 'done' }])
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

test('normalizeTaskData repairs unknown activeViewId to an existing default view', () => {
  const normalized = normalizeTaskData({
    views: [
      {
        id: 'custom-grid',
        name: 'Custom grid',
        type: 'grid',
        visibleFieldIds: ['title'],
        filters: [],
        sorts: [],
      },
    ],
    ui: { activeViewId: 'missing-view' },
  })

  assert.equal(normalized.ui.activeViewId, 'custom-grid')
})

test('normalizeTaskData trims view search query strings', () => {
  const normalized = normalizeTaskData({
    views: [
      {
        id: 'grid-default',
        name: 'Grid',
        type: 'grid',
        visibleFieldIds: ['title'],
        filters: [],
        sorts: [],
        searchQuery: '  ship  ',
      },
    ],
    ui: { activeViewId: 'grid-default' },
  })

  assert.equal(normalized.views[0].searchQuery, 'ship')
})

test('normalizeTaskData omits empty view search query strings', () => {
  const normalized = normalizeTaskData({
    views: [
      {
        id: 'grid-default',
        name: 'Grid',
        type: 'grid',
        visibleFieldIds: ['title'],
        filters: [],
        sorts: [],
        searchQuery: '   ',
      },
    ],
    ui: { activeViewId: 'grid-default' },
  })

  assert.equal(normalized.views[0].searchQuery, undefined)
})

test('normalizeTaskData rejects invalid field type', () => {
  assert.throws(
    () =>
      normalizeTaskData({
        fields: [{ id: 'custom', name: 'Custom', type: 'bogus' }],
      }),
    /field type is invalid/
  )
})

test('normalizeTaskData rejects invalid view type', () => {
  assert.throws(
    () =>
      normalizeTaskData({
        views: [{ id: 'custom', name: 'Custom', type: 'timeline', visibleFieldIds: [], filters: [], sorts: [] }],
      }),
    /view type is invalid/
  )
})

test('normalizeTaskData rejects malformed field options', () => {
  assert.throws(
    () =>
      normalizeTaskData({
        fields: [{ id: 'custom', name: 'Custom', type: 'singleSelect', options: [{ id: 'one', name: 1 }] }],
      }),
    /field option name is required/
  )
})

test('normalizeTaskData rejects malformed view filters', () => {
  assert.throws(
    () =>
      normalizeTaskData({
        views: [
          {
            id: 'custom',
            name: 'Custom',
            type: 'grid',
            visibleFieldIds: [],
            filters: [{ fieldId: 'status', operator: 'equals', value: 'todo' }],
            sorts: [],
          },
        ],
      }),
    /filter operator is invalid/
  )
})

test('normalizeTaskData rejects malformed view sorts', () => {
  assert.throws(
    () =>
      normalizeTaskData({
        views: [
          {
            id: 'custom',
            name: 'Custom',
            type: 'grid',
            visibleFieldIds: [],
            filters: [],
            sorts: [{ fieldId: 'createdAt', direction: 'sideways' }],
          },
        ],
      }),
    /sort direction is invalid/
  )
})

test('normalizeTaskData clones nested field and view state', () => {
  const input = {
    fields: [
      {
        id: 'custom',
        name: 'Custom',
        type: 'singleSelect',
        options: [{ id: 'one', name: 'One', color: '#111111' }],
      },
    ],
    views: [
      {
        id: 'custom',
        name: 'Custom',
        type: 'grid',
        visibleFieldIds: ['title'],
        filters: [{ fieldId: 'status', operator: 'is', value: 'todo' }],
        sorts: [{ fieldId: 'createdAt', direction: 'desc' }],
        columnWidths: { title: 300 },
      },
    ],
  }

  const normalized = normalizeTaskData(input)

  input.fields[0].options[0].name = 'Changed option'
  input.views[0].visibleFieldIds[0] = 'priority'
  input.views[0].filters[0].fieldId = 'priority'
  input.views[0].sorts[0].direction = 'asc'
  input.views[0].columnWidths.title = 999

  assert.equal(normalized.fields[0].options?.[0].name, 'One')
  assert.deepEqual(normalized.views[0].visibleFieldIds, ['title'])
  assert.deepEqual(normalized.views[0].filters, [{ fieldId: 'status', operator: 'is', value: 'todo' }])
  assert.deepEqual(normalized.views[0].sorts, [{ fieldId: 'createdAt', direction: 'desc' }])
  assert.deepEqual(normalized.views[0].columnWidths, { title: 300 })
})
