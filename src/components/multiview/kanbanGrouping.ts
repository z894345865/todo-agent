import type { Task, TaskPriority, TaskStatus } from '../../tasks/types.ts'

export type KanbanGroupBy = 'status' | 'priority' | 'tagIds'

export interface KanbanDropTarget {
  groupBy: KanbanGroupBy
  groupValue: string
}

export interface KanbanDragSource {
  groupBy?: KanbanGroupBy
  groupValue?: string
}

export type KanbanTaskPatch = Partial<Pick<Task, 'status' | 'priority' | 'tagIds'>>

export function getKanbanTaskPatch(task: Task, target: KanbanDropTarget, _source: KanbanDragSource = {}): KanbanTaskPatch | undefined {
  if (target.groupBy === 'status') {
    return isTaskStatus(target.groupValue) && task.status !== target.groupValue ? { status: target.groupValue } : undefined
  }

  if (target.groupBy === 'priority') {
    return isTaskPriority(target.groupValue) && task.priority !== target.groupValue ? { priority: target.groupValue } : undefined
  }

  if (target.groupValue === 'none') {
    return task.tagIds.length > 0 ? { tagIds: [] } : undefined
  }

  const nextTagIds = [target.groupValue]

  return arraysEqual(task.tagIds, nextTagIds) ? undefined : { tagIds: nextTagIds }
}

export function isKanbanGroupBy(value: unknown): value is KanbanGroupBy {
  return value === 'status' || value === 'priority' || value === 'tagIds'
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'todo' || value === 'doing' || value === 'done' || value === 'blocked'
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === 'urgent' || value === 'high' || value === 'medium' || value === 'low'
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}
