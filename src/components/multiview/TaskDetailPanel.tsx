import { useEffect, useMemo, useRef, useState } from 'react'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../tasks/displayLabels.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { TaskPriority, TaskStatus } from '../../tasks/types.ts'
import { isTaskOverdue } from './taskDates.ts'
import { PRIORITY_VISUALS, STATUS_VISUALS, tagTokenStyle, tokenStyle } from './taskVisuals.ts'
import { shouldCommitTextInputChange, toOptionalTextValue } from './textInputDraft.ts'

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: STATUS_LABELS.todo },
  { value: 'doing', label: STATUS_LABELS.doing },
  { value: 'done', label: STATUS_LABELS.done },
  { value: 'blocked', label: STATUS_LABELS.blocked },
]

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
  { value: 'urgent', label: PRIORITY_LABELS.urgent },
  { value: 'high', label: PRIORITY_LABELS.high },
  { value: 'medium', label: PRIORITY_LABELS.medium },
  { value: 'low', label: PRIORITY_LABELS.low },
]

export function TaskDetailPanel() {
  const selectedTaskId = useTaskStore((state) => state.selectedTaskId)
  const tasks = useTaskStore((state) => state.tasks)
  const tags = useTaskStore((state) => state.tags)
  const updateTask = useTaskStore((state) => state.updateTask)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [titleText, setTitleText] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const titleComposing = useRef(false)
  const descriptionComposing = useRef(false)

  const task = tasks.find((item) => item.id === selectedTaskId)
  const taskTags = useMemo(() => tags.filter((tag) => task?.tagIds.includes(tag.id)), [tags, task])

  useEffect(() => {
    setTitleText(task?.title ?? '')
    setDescriptionText(task?.description ?? '')
    titleComposing.current = false
    descriptionComposing.current = false
  }, [task?.id])

  if (!selectedTaskId || !task) {
    return null
  }
  const overdue = isTaskOverdue(task)

  const saveTitle = (value: string) => {
    if (value.trim() && value !== task.title) {
      void updateTask(task.id, { title: value }).catch(console.error)
    }
  }

  const saveDescription = (value: string) => {
    const description = toOptionalTextValue(value)
    if (description !== task.description) {
      void updateTask(task.id, { description }).catch(console.error)
    }
  }

  return (
    <aside className="task-detail-panel" aria-label="任务详情">
      <div className="task-detail-panel__header">
        <h2>任务详情</h2>
        <button aria-label="关闭任务详情" className="task-detail-panel__close" onClick={() => void setSelectedTask(undefined).catch(console.error)} type="button">
          x
        </button>
      </div>

      <div className="task-detail-panel__summary" aria-label="任务标记">
        <span className="task-token" style={tokenStyle(STATUS_VISUALS[task.status])}>{STATUS_LABELS[task.status]}</span>
        <span className="task-token" style={tokenStyle(PRIORITY_VISUALS[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
        {taskTags.map((tag) => (
          <span className="task-token task-token--tag" key={tag.id} style={tagTokenStyle(tag.color)}>
            {tag.name}
          </span>
        ))}
      </div>

      <label className="task-field">
        <span>标题</span>
        <input
          onBlur={(event) => saveTitle(event.target.value)}
          onChange={(event) => {
            const title = event.target.value
            setTitleText(title)
            if (shouldCommitTextInputChange(titleComposing.current, Boolean((event.nativeEvent as InputEvent).isComposing))) {
              saveTitle(title)
            }
          }}
          onCompositionEnd={(event) => {
            titleComposing.current = false
            setTitleText(event.currentTarget.value)
            saveTitle(event.currentTarget.value)
          }}
          onCompositionStart={() => {
            titleComposing.current = true
          }}
          type="text"
          value={titleText}
        />
      </label>

      <div className="task-detail-panel__row">
        <label className="task-field">
          <span>状态</span>
          <select onChange={(event) => void updateTask(task.id, { status: event.target.value as TaskStatus }).catch(console.error)} value={task.status}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="task-field">
          <span>优先级</span>
          <select onChange={(event) => void updateTask(task.id, { priority: event.target.value as TaskPriority }).catch(console.error)} value={task.priority}>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="task-field">
        <span className="task-field__label">
          截止日期
          {overdue && <span className="task-overdue-icon" aria-label="任务已超期" role="img" />}
        </span>
        <input onChange={(event) => void updateTask(task.id, { dueDate: event.target.value || undefined }).catch(console.error)} type="date" value={task.dueDate ?? ''} />
      </label>

      <label className="task-field">
        <span>描述</span>
        <textarea
          onBlur={(event) => saveDescription(event.target.value)}
          onChange={(event) => {
            const description = event.target.value
            setDescriptionText(description)
            if (shouldCommitTextInputChange(descriptionComposing.current, Boolean((event.nativeEvent as InputEvent).isComposing))) {
              saveDescription(description)
            }
          }}
          onCompositionEnd={(event) => {
            descriptionComposing.current = false
            setDescriptionText(event.currentTarget.value)
            saveDescription(event.currentTarget.value)
          }}
          onCompositionStart={() => {
            descriptionComposing.current = true
          }}
          rows={5}
          value={descriptionText}
        />
      </label>

      <label className="task-field">
        <span>标签</span>
        <select
          onChange={(event) => void updateTask(task.id, { tagIds: event.target.value ? [event.target.value] : [] }).catch(console.error)}
          value={task.tagIds[0] ?? ''}
        >
          <option value="">无标签</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>

      <div className="task-detail-panel__tags" aria-label="当前标签">
        {taskTags.length > 0 ? (
          taskTags.map((tag) => (
            <span className="task-detail-panel__tag" key={tag.id} style={tagTokenStyle(tag.color)}>
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
