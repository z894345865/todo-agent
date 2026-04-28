import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addFilterRule,
  clearFilterRule,
  formatFilterChip,
  formatGroupChip,
  formatSortChip,
  resetColumnWidths,
  setGroupBy,
  setSortRule,
  setVisibleField,
} from '../src/tasks/viewConfig.ts'
import { DEFAULT_FIELDS, DEFAULT_VIEWS } from '../src/tasks/defaults.ts'
import type { FilterRule, SortRule, ViewDefinition } from '../src/tasks/types.ts'

function gridView(): ViewDefinition {
  return {
    ...DEFAULT_VIEWS.find((view) => view.id === 'grid-default')!,
    visibleFieldIds: ['title', 'status', 'priority'],
    filters: [],
    sorts: [],
    columnWidths: { title: 260, status: 120, priority: 100 },
  }
}

test('addFilterRule replaces field/operator-compatible rule and keeps other rules', () => {
  const view = gridView()
  const first: FilterRule = { fieldId: 'status', operator: 'is', value: 'todo' }
  const second: FilterRule = { fieldId: 'priority', operator: 'is', value: 'high' }
  const replaced: FilterRule = { fieldId: 'status', operator: 'is', value: 'doing' }

  const next = addFilterRule(addFilterRule(addFilterRule(view, first), second), replaced)

  assert.deepEqual(next.filters, [second, replaced])
  assert.deepEqual(view.filters, [])
})

test('addFilterRule clones surviving rules and nested rule values', () => {
  const nestedValue = { range: { from: '2026-04-01', to: '2026-04-30' } }
  const view = {
    ...gridView(),
    filters: [{ fieldId: 'dueDate', operator: 'between', value: nestedValue }],
  }
  const next = addFilterRule(view, { fieldId: 'status', operator: 'is', value: ['todo', 'doing'] })

  assert.deepEqual(next.filters[0], view.filters[0])
  assert.notEqual(next.filters[0], view.filters[0])
  assert.notEqual(next.filters[0].value, view.filters[0].value)
  assert.notEqual((next.filters[0].value as typeof nestedValue).range, nestedValue.range)
  assert.notEqual(next.filters[1].value, view.filters[0].value)
})

test('clearFilterRule removes all rules for the requested field', () => {
  const view = {
    ...gridView(),
    filters: [
      { fieldId: 'status', operator: 'is', value: 'todo' },
      { fieldId: 'priority', operator: 'is', value: 'high' },
    ],
  }

  assert.deepEqual(clearFilterRule(view, 'status').filters, [{ fieldId: 'priority', operator: 'is', value: 'high' }])
})

test('setSortRule replaces sorts with one sort rule', () => {
  const sort: SortRule = { fieldId: 'dueDate', direction: 'asc' }

  assert.deepEqual(setSortRule(gridView(), sort).sorts, [sort])
})

test('setGroupBy updates grouping without mutating the source view', () => {
  const view = gridView()
  const next = setGroupBy(view, 'priority')

  assert.equal(next.groupBy, 'priority')
  assert.equal(view.groupBy, undefined)
})

test('setVisibleField preserves title and toggles other fields', () => {
  const view = gridView()

  assert.deepEqual(setVisibleField(view, 'priority', false).visibleFieldIds, ['title', 'status'])
  assert.deepEqual(setVisibleField(view, 'title', false).visibleFieldIds, ['title', 'status', 'priority'])
  assert.deepEqual(setVisibleField(view, 'dueDate', true).visibleFieldIds, ['title', 'status', 'priority', 'dueDate'])
})

test('resetColumnWidths restores widths from field defaults', () => {
  const view = { ...gridView(), columnWidths: { title: 999 } }
  const next = resetColumnWidths(view, DEFAULT_VIEWS.find((item) => item.id === 'grid-default')!)

  assert.equal(next.columnWidths?.title, 260)
  assert.equal(next.columnWidths?.status, 120)
})

test('chip formatters produce readable labels', () => {
  assert.equal(formatFilterChip({ fieldId: 'status', operator: 'is', value: 'todo' }, DEFAULT_FIELDS), 'Status is todo')
  assert.equal(formatFilterChip({ fieldId: 'status', operator: 'is', value: ['todo', 'doing'] }, DEFAULT_FIELDS), 'Status is todo, doing')
  assert.equal(
    formatFilterChip({ fieldId: 'dueDate', operator: 'between', value: ['2026-04-01', '2026-04-30'] }, DEFAULT_FIELDS),
    'Due date between 2026-04-01 to 2026-04-30'
  )
  assert.equal(formatSortChip({ fieldId: 'dueDate', direction: 'asc' }, DEFAULT_FIELDS), 'Due date ascending')
  assert.equal(formatGroupChip('priority', DEFAULT_FIELDS), 'Grouped by Priority')
})
