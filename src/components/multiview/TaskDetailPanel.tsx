import { useEffect, useMemo, useState } from 'react'
import { useTaskStore } from '../../tasks/store.ts'
import type { TaskPriority, TaskStatus } from '../../tasks/types.ts'

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: '待办' },
  { value: 'doing', label: '进行中' },
  { value: 'done', label: '已完成' },
  { value: 'blocked', label: '阻塞' },
]

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
]

export function TaskDetailPanel() {
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId)
  const tasks = useTaskStore((state) => state.tasks)
  const tags = useTaskStore((state) => state.tags)
  const updateTask = useTaskStore((state) => state.updateTask)
  const createTag = useTaskStore((state) => state.createTag)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [tagText, setTagText] = useState('')
  const [tagError, setTagError] = useState<string>()

  const task = tasks.find((item) => item.id === selectedTaskId)
  const taskTags = useMemo(() => tags.filter((tag) => task?.tagIds.includes(tag.id)), [tags, task])

  useEffect(() => {
    setTagText(taskTags.map((tag) => tag.name).join(', '))
    setTagError(undefined)
  }, [task?.id, taskTags])

  if (!selectedTaskId || !task) {
    return null
  }

  const saveTags = async () => {
    const names = parseTagNames(tagText)
    try {
      const nextTags = []
      for (const name of names) {
        const existingTag = useTaskStore
          .getState()
          .tags.find((tag) => tag.name.toLocaleLowerCase() === name.toLocaleLowerCase())
        nextTags.push(existingTag ?? (await createTag(name)))
      }

      await updateTask(task.id, { tagIds: nextTags.map((tag) => tag.id) })
      setTagText(nextTags.map((tag) => tag.name).join(', '))
      setTagError(undefined)
    } catch (error) {
      console.error(error)
      setTagError('标签保存失败，请重试。')
    }
  }

  return (
    <aside className="task-detail-panel" aria-label="任务详情">
      <div className="task-detail-panel__header">
        <h2>任务详情</h2>
        <button
          aria-label="关闭任务详情"
          className="task-detail-panel__close"
          onClick={() => void setSelectedTask(undefined).catch(console.error)}
          type="button"
        >
          ×
        </button>
      </div>

      <label className="task-field">
        <span>标题</span>
        <input
          onChange={(event) => {
            const title = event.target.value
            if (title.trim()) {
              void updateTask(task.id, { title }).catch(console.error)
            }
          }}
          type="text"
          value={task.title}
        />
      </label>

      <div className="task-detail-panel__row">
        <label className="task-field">
          <span>状态</span>
          <select
            onChange={(event) => void updateTask(task.id, { status: event.target.value as TaskStatus }).catch(console.error)}
            value={task.status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-field">
          <span>优先级</span>
          <select
            onChange={(event) => void updateTask(task.id, { priority: event.target.value as TaskPriority }).catch(console.error)}
            value={task.priority}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task-field">
        <span>截止日期</span>
        <input
          onChange={(event) => void updateTask(task.id, { dueDate: event.target.value || undefined }).catch(console.error)}
          type="date"
          value={task.dueDate ?? ''}
        />
      </label>

      <label className="task-field">
        <span>描述</span>
        <textarea
          onChange={(event) => void updateTask(task.id, { description: event.target.value || undefined }).catch(console.error)}
          rows={5}
          value={task.description ?? ''}
        />
      </label>

      <label className="task-field">
        <span>标签</span>
        <input
          aria-describedby={tagError ? 'task-detail-tag-error' : undefined}
          onBlur={() => void saveTags()}
          onChange={(event) => setTagText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          placeholder="Design, Follow up"
          type="text"
          value={tagText}
        />
      </label>

      {tagError && (
        <div className="task-detail-panel__tag-error" id="task-detail-tag-error" role="alert">
          {tagError}
        </div>
      )}

      <div className="task-detail-panel__tags" aria-label="当前标签">
        {taskTags.length > 0 ? (
          taskTags.map((tag) => (
            <span className="task-detail-panel__tag" key={tag.id} style={{ borderColor: tag.color, color: tag.color }}>
              {tag.name}
            </span>
          ))
        ) : (
          <span className="task-detail-panel__empty">暂无标签</span>
        )}
      </div>
    </aside>
  )
}

function parseTagNames(value: string): string[] {
  const seen = new Set<string>()
  const names: string[] = []

  for (const rawName of value.split(',')) {
    const name = rawName.trim()
    const key = name.toLocaleLowerCase()
    if (name && !seen.has(key)) {
      seen.add(key)
      names.push(name)
    }
  }

  return names
}
