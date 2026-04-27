import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useCallback, useMemo } from 'react'
import { groupTasks } from '../../tasks/model.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { Task, TaskStatus, ViewDefinition } from '../../tasks/types.ts'

const STATUS_COLUMNS: Array<{ id: TaskStatus; label: string }> = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'done', label: '已完成' },
  { id: 'blocked', label: '阻塞' },
]

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  urgent: '紧急',
  high: '高',
  medium: '中',
  low: '低',
}

interface TaskKanbanViewProps {
  view: ViewDefinition
}

export function TaskKanbanView({ view }: TaskKanbanViewProps) {
  const tasks = useTaskStore((state) => state.getPreparedTasks(view.id))
  const updateTask = useTaskStore((state) => state.updateTask)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const groupBy = view.groupBy ?? 'status'

  const groups = useMemo(() => groupTasks(tasks, groupBy), [groupBy, tasks])
  const columns = useMemo(() => {
    if (groupBy === 'status') {
      return STATUS_COLUMNS.map((column) => ({
        ...column,
        tasks: groups[column.id] ?? [],
      }))
    }

    return Object.keys(groups).map((groupId) => ({
      id: groupId,
      label: groupId === 'none' ? '未分组' : groupId,
      tasks: groups[groupId] ?? [],
    }))
  }, [groupBy, groups])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const taskId = event.active.data.current?.taskId
      const status = event.over?.data.current?.status
      if (!taskId || !status) {
        return
      }

      void updateTask(String(taskId), { status }).catch(console.error)
    },
    [updateTask]
  )

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="task-kanban-view">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            label={column.label}
            status={isTaskStatus(column.id) ? column.id : undefined}
            tasks={column.tasks}
            onSelectTask={setSelectedTask}
          />
        ))}
      </div>
    </DndContext>
  )
}

interface KanbanColumnProps {
  id: string
  label: string
  status?: TaskStatus
  tasks: Task[]
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanColumn({ id, label, status, tasks, onSelectTask }: KanbanColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `kanban-column-${id}`,
    data: status ? { status } : {},
  })

  return (
    <section ref={setNodeRef} className={`task-kanban-column${isOver ? ' is-over' : ''}`}>
      <header className="task-kanban-column__header">
        <h2>{label}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-kanban-column__cards">
        {tasks.map((task) => (
          <KanbanTaskCard key={task.id} task={task} onSelectTask={onSelectTask} />
        ))}
      </div>
    </section>
  )
}

interface KanbanTaskCardProps {
  task: Task
  onSelectTask: (taskId: string) => Promise<void>
}

function KanbanTaskCard({ task, onSelectTask }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `kanban-task-${task.id}`,
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

function isTaskStatus(value: string): value is TaskStatus {
  return STATUS_COLUMNS.some((column) => column.id === value)
}
