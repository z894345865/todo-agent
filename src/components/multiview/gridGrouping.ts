import { PRIORITY_LABELS, STATUS_LABELS } from '../../tasks/displayLabels.ts'
import type { Tag, Task, TaskPriority, TaskStatus } from '../../tasks/types.ts'

export type GridGroupBy = 'status' | 'priority' | 'tagIds'

export type GridRow =
  | {
      kind: 'group'
      id: string
      label: string
      count: number
      groupBy: GridGroupBy
      groupValue: string
    }
  | {
      kind: 'task'
      task: Task
    }

const STATUS_ORDER: TaskStatus[] = ['todo', 'doing', 'done', 'blocked']
const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export function createGridRows(tasks: Task[], groupBy: string | undefined, tags: Tag[]): GridRow[] {
  if (!isGridGroupBy(groupBy)) {
    return tasks.map((task) => ({ kind: 'task', task }))
  }

  const groups = new Map<string, Task[]>()
  for (const task of tasks) {
    const key = getGroupKey(task, groupBy)
    groups.set(key, [...(groups.get(key) ?? []), task])
  }

  const rows: GridRow[] = []
  for (const group of getGroupDefinitions(groupBy, tags, groups)) {
    const groupTasks = groups.get(group.value)
    if (!groupTasks || groupTasks.length === 0) {
      continue
    }

    rows.push({
      kind: 'group',
      id: `${groupBy}:${group.value}`,
      label: group.label,
      count: groupTasks.length,
      groupBy,
      groupValue: group.value,
    })
    rows.push(...groupTasks.map((task) => ({ kind: 'task' as const, task })))
  }

  return rows
}

export function isGridGroupBy(value: unknown): value is GridGroupBy {
  return value === 'status' || value === 'priority' || value === 'tagIds'
}

function getGroupKey(task: Task, groupBy: GridGroupBy): string {
  if (groupBy === 'tagIds') {
    return task.tagIds[0] ?? 'none'
  }

  return task[groupBy]
}

function getGroupDefinitions(groupBy: GridGroupBy, tags: Tag[], groups: Map<string, Task[]>): Array<{ value: string; label: string }> {
  if (groupBy === 'status') {
    return STATUS_ORDER.map((value) => ({ value, label: STATUS_LABELS[value] }))
  }

  if (groupBy === 'priority') {
    return PRIORITY_ORDER.map((value) => ({ value, label: PRIORITY_LABELS[value] }))
  }

  const knownTagGroups = tags.map((tag) => ({ value: tag.id, label: tag.name }))
  const unknownTagGroups = [...groups.keys()]
    .filter((value) => value !== 'none' && !tags.some((tag) => tag.id === value))
    .sort((left, right) => left.localeCompare(right, 'zh-CN'))
    .map((value) => ({ value, label: value }))

  return [...knownTagGroups, ...unknownTagGroups, { value: 'none', label: '无标签' }]
}
