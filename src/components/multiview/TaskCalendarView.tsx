import { useMemo, useState } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { Task, ViewDefinition } from '../../tasks/types.ts'

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const MONTH_FORMATTER = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' })

interface TaskCalendarViewProps {
  view: ViewDefinition
}

export function TaskCalendarView({ view }: TaskCalendarViewProps) {
  const tasks = useTaskStore((state) => state.getPreparedTasks(view.id))
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))

  const monthKey = toMonthKey(currentMonth)
  const calendarDays = useMemo(() => createCalendarDays(currentMonth), [currentMonth])
  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>()
    for (const task of tasks) {
      if (!task.dueDate?.startsWith(monthKey)) {
        continue
      }

      grouped.set(task.dueDate, [...(grouped.get(task.dueDate) ?? []), task])
    }
    return grouped
  }, [monthKey, tasks])
  const unscheduledTasks = useMemo(() => tasks.filter((task) => !task.dueDate), [tasks])

  return (
    <div className="task-calendar-view">
      <header className="task-calendar-view__header">
        <button type="button" onClick={() => setCurrentMonth((month) => addMonths(month, -1))} aria-label="上个月">
          ‹
        </button>
        <h2>{MONTH_FORMATTER.format(currentMonth)}</h2>
        <button type="button" onClick={() => setCurrentMonth((month) => addMonths(month, 1))} aria-label="下个月">
          ›
        </button>
      </header>

      <div className="task-calendar-grid">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="task-calendar-grid__weekday">
            {label}
          </div>
        ))}
        {calendarDays.map((day) => {
          const dateKey = toDateKey(day)
          const dayTasks = tasksByDate.get(dateKey) ?? []
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
          return (
            <section key={dateKey} className={`task-calendar-day${isCurrentMonth ? '' : ' is-muted'}`}>
              <time className="task-calendar-day__number" dateTime={dateKey}>
                {day.getDate()}
              </time>
              <div className="task-calendar-day__tasks">
                {dayTasks.map((task) => (
                  <CalendarTaskButton key={task.id} task={task} onSelectTask={setSelectedTask} />
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <section className="task-calendar-unscheduled" aria-label="未排期任务">
        <header>
          <h3>未排期</h3>
          <span>{unscheduledTasks.length}</span>
        </header>
        <div className="task-calendar-unscheduled__list">
          {unscheduledTasks.map((task) => (
            <CalendarTaskButton key={task.id} task={task} onSelectTask={setSelectedTask} />
          ))}
        </div>
      </section>
    </div>
  )
}

interface CalendarTaskButtonProps {
  task: Task
  onSelectTask: (taskId: string) => Promise<void>
}

function CalendarTaskButton({ task, onSelectTask }: CalendarTaskButtonProps) {
  return (
    <button type="button" className="task-calendar-task" onClick={() => void onSelectTask(task.id).catch(console.error)}>
      {task.title}
    </button>
  )
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function createCalendarDays(month: Date): Date[] {
  const firstDay = startOfMonth(month)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - mondayOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`
}

function toDateKey(date: Date): string {
  return `${toMonthKey(date)}-${padDatePart(date.getDate())}`
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}
