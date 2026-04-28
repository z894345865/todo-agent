import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../tasks/displayLabels.ts'
import { groupTasks } from '../../tasks/model.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { Tag, Task, TaskPriority, TaskStatus, ViewDefinition } from '../../tasks/types.ts'
import { getKanbanTaskPatch, isKanbanGroupBy, type KanbanGroupBy } from './kanbanGrouping.ts'
import { isTaskOverdue } from './taskDates.ts'
import { PRIORITY_VISUALS, STATUS_VISUALS, tagTokenStyle, tokenStyle } from './taskVisuals.ts'

const STATUS_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: STATUS_LABELS.todo },
  { id: 'doing', label: STATUS_LABELS.doing },
  { id: 'done', label: STATUS_LABELS.done },
  { id: 'blocked', label: STATUS_LABELS.blocked },
]

const PRIORITY_COLUMNS: Array<{ id: TaskPriority; label: string }> = [
  { id: 'urgent', label: PRIORITY_LABELS.urgent },
  { id: 'high', label: PRIORITY_LABELS.high },
  { id: 'medium', label: PRIORITY_LABELS.medium },
  { id: 'low', label: PRIORITY_LABELS.low },
]

interface TaskKanbanViewProps {
  view: ViewDefinition
}

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
        style: tokenStyle(STATUS_VISUALS[column.id]),
        tasks: groups[column.id] ?? [],
      }))
    }

    if (groupBy === 'priority') {
      return PRIORITY_COLUMNS.map((column) => ({
        ...column,
        groupBy,
        groupValue: column.id,
        style: tokenStyle(PRIORITY_VISUALS[column.id]),
        tasks: groups[column.id] ?? [],
      }))
    }

    const tagColumns = tags.map((tag) => ({
      id: tag.id,
      label: tag.name,
      groupBy,
      groupValue: tag.id,
      style: tagTokenStyle(tag.color),
      tasks: groups[tag.id] ?? [],
    }))

    return [
      ...tagColumns,
      {
        id: 'none',
        label: '无标签',
        groupBy,
        groupValue: 'none',
        style: undefined,
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
        const patch = getKanbanTaskPatch(
          task,
          { groupBy: dropData.groupBy, groupValue: dropData.groupValue },
          { groupBy: event.active.data.current?.groupBy, groupValue: event.active.data.current?.groupValue }
        )
        if (patch) {
          await updateTask(taskId, patch)
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
              style={column.style}
              tasks={column.tasks}
              tags={tags}
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
  style?: CSSProperties
  tasks: Task[]
  tags: Tag[]
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanColumn({ id, label, groupBy, groupValue, style, tasks, tags, onSelectTask }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `kanban-column-${id}`,
    data: { groupBy, groupValue },
  })

  return (
    <section ref={setNodeRef} className={`task-kanban-column${isOver ? ' is-over' : ''}`} style={style}>
      <header className="task-kanban-column__header">
        <h2>
          <span className="task-kanban-column__dot" aria-hidden="true" />
          {label}
        </h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-kanban-column__cards">
        {tasks.map((task) => (
          <KanbanTaskCard key={`${id}-${task.id}`} dragId={`${id}-${task.id}`} groupBy={groupBy} groupValue={groupValue} task={task} tags={tags} onSelectTask={onSelectTask} />
        ))}
      </div>
    </section>
  )
}

interface KanbanTaskCardProps {
  dragId: string
  groupBy: KanbanGroupBy
  groupValue: string
  task: Task
  tags: Tag[]
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanTaskCard({ dragId, groupBy, groupValue, task, tags, onSelectTask }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: { taskId: task.id, groupBy, groupValue },
  })
  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined
  const taskTags = tags.filter((tag) => task.tagIds.includes(tag.id))
  const overdue = isTaskOverdue(task)

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
      <span className="task-kanban-card__rail" style={tokenStyle(PRIORITY_VISUALS[task.priority])} aria-hidden="true" />
      <span className="task-kanban-card__title">{task.title}</span>
      <span className="task-kanban-card__meta">
        <span className="task-token" style={tokenStyle(STATUS_VISUALS[task.status])}>{STATUS_LABELS[task.status]}</span>
        <span className="task-token" style={tokenStyle(PRIORITY_VISUALS[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
        {task.dueDate && (
          <span className="task-kanban-card__due">
            <time dateTime={task.dueDate}>{task.dueDate}</time>
            {overdue && <span className="task-overdue-icon" aria-label="任务已超期" role="img" />}
          </span>
        )}
      </span>
      {taskTags.length > 0 && (
        <span className="task-kanban-card__tags">
          {taskTags.map((tag) => (
            <span className="task-token task-token--tag" key={tag.id} style={tagTokenStyle(tag.color)}>
              {tag.name}
            </span>
          ))}
        </span>
      )}
    </button>
  )
}
