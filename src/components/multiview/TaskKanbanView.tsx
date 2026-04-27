import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useMemo, useState } from 'react'
import { groupTasks } from '../../tasks/model.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { Task, TaskPriority, TaskStatus, ViewDefinition } from '../../tasks/types.ts'

const STATUS_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'blocked', label: '阻塞' },
]

const PRIORITY_COLUMNS: Array<{ id: TaskPriority; label: string }> = [
  { id: 'urgent', label: '紧急' },
  { id: 'high', label: '高' },
  { id: 'medium', label: '中' },
  { id: 'low', label: '低' },
]

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

interface TaskKanbanViewProps {
  view: ViewDefinition
}

type KanbanGroupBy = 'status' | 'priority' | 'tagIds'

export function TaskKanbanView({ view }: TaskKanbanViewProps) {
  const tasks = useTaskStore((state) => state.getPreparedTasks(view.id))
  const tags = useTaskStore((state) => state.tags)
  const updateTask = useTaskStore((state) => state.updateTask)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [dragError, setDragError] = useState<string>()
  const groupBy: KanbanGroupBy = isKanbanGroupBy(view.groupBy) ? view.groupBy : 'status'

  const groups = useMemo(() => groupTasks(tasks, groupBy), [groupBy, tasks])
  const columns = useMemo(() => {
    if (groupBy === 'status') {
      return STATUS_COLUMNS.map((column) => ({
        ...column,
        groupBy,
        groupValue: column.id,
        tasks: groups[column.id] ?? [],
      }))
    }

    if (groupBy === 'priority') {
      return PRIORITY_COLUMNS.map((column) => ({
        ...column,
        groupBy,
        groupValue: column.id,
        tasks: groups[column.id] ?? [],
      }))
    }

    const tagColumns = tags.map((tag) => ({
      id: tag.id,
      label: tag.name,
      groupBy,
      groupValue: tag.id,
      tasks: groups[tag.id] ?? [],
    }))

    return [
      ...tagColumns,
      {
        id: 'none',
        label: '无标签',
        groupBy,
        groupValue: 'none',
        tasks: groups.none ?? [],
      },
    ]
  }, [groupBy, groups, tags])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const taskId = event.active.data.current?.taskId
      if (typeof taskId !== 'string') {
        return
      }

      const task = useTaskStore.getState().tasks.find((item) => item.id === taskId)
      const dropData = event.over?.data.current
      if (!task || !dropData || !isKanbanGroupBy(dropData.groupBy) || typeof dropData.groupValue !== 'string') {
        return
      }

      setDragError(undefined)
      try {
        if (dropData.groupBy === 'status' && isTaskStatus(dropData.groupValue)) {
          await updateTask(taskId, { status: dropData.groupValue })
        } else if (dropData.groupBy === 'priority' && isTaskPriority(dropData.groupValue)) {
          await updateTask(taskId, { priority: dropData.groupValue })
        } else if (dropData.groupBy === 'tagIds') {
          const nextTagIds = dropData.groupValue === 'none' ? [] : addUnique(task.tagIds, dropData.groupValue)
          await updateTask(taskId, { tagIds: nextTagIds })
        }
      } catch (error) {
        console.error(error)
        setDragError('移动任务失败，请重试。')
      }
    },
    [updateTask]
  )

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="task-kanban-view-shell">
        {dragError && (
          <div className="task-kanban-view__error" role="alert">
            {dragError}
          </div>
        )}
        <div className="task-kanban-view">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              label={column.label}
              groupBy={column.groupBy}
              groupValue={column.groupValue}
              tasks={column.tasks}
              onSelectTask={setSelectedTask}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}

interface KanbanColumnProps {
  id: string
  label: string
  groupBy: KanbanGroupBy
  groupValue: string
  tasks: Task[]
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanColumn({ id, label, groupBy, groupValue, tasks, onSelectTask }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `kanban-column-${id}`,
    data: { groupBy, groupValue },
  })

  return (
    <section ref={setNodeRef} className={`task-kanban-column${isOver ? ' is-over' : ''}`}>
      <header className="task-kanban-column__header">
        <h2>{label}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-kanban-column__cards">
        {tasks.map((task) => (
          <KanbanTaskCard key={`${id}-${task.id}`} dragId={`${id}-${task.id}`} task={task} onSelectTask={onSelectTask} />
        ))}
      </div>
    </section>
  )
}

interface KanbanTaskCardProps {
  dragId: string
  task: Task
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanTaskCard({ dragId, task, onSelectTask }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { taskId: task.id },
  })
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  return (
    <button
      ref={setNodeRef}
      className={`task-kanban-card${isDragging ? ' is-dragging' : ''}`}
      style={style}
      type="button"
      onClick={() => void onSelectTask(task.id).catch(console.error)}
      {...listeners}
      {...attributes}
    >
      <span className="task-kanban-card__title">{task.title}</span>
      <span className="task-kanban-card__meta">
        <span>{PRIORITY_LABELS[task.priority]}</span>
        {task.dueDate && <time dateTime={task.dueDate}>{task.dueDate}</time>}
      </span>
    </button>
  )
}

function isKanbanGroupBy(value: unknown): value is KanbanGroupBy {
  return value === 'status' || value === 'priority' || value === 'tagIds'
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && STATUS_COLUMNS.some((column) => column.id === value)
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return typeof value === 'string' && PRIORITY_COLUMNS.some((column) => column.id === value)
}

function addUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value]
}
