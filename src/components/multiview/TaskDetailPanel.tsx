import { useEffect, useMemo, useRef, useState } from 'react'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../tasks/displayLabels.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { TaskPriority, TaskStatus } from '../../tasks/types.ts'
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
  const createTag = useTaskStore((state) => state.createTag)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [titleText, setTitleText] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const [tagText, setTagText] = useState('')
  const [tagError, setTagError] = useState<string>()
  const titleComposing = useRef(false)
  const descriptionComposing = useRef(false)

  const task = tasks.find((item) => item.id === selectedTaskId)
  const taskTags = useMemo(() => tags.filter((tag) => task?.tagIds.includes(tag.id)), [tags, task])

  useEffect(() => {
    setTagText(taskTags.map((tag) => tag.name).join(', '))
    setTagError(undefined)
  }, [task?.id, taskTags])

  useEffect(() => {
    setTitleText(task?.title ?? '')
    setDescriptionText(task?.description ?? '')
    titleComposing.current = false
    descriptionComposing.current = false
  }, [task?.id])

  if (!selectedTaskId || !task) {
    return null
  }

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
        <button aria-label="关闭任务详情" className="task-detail-panel__close" onClick={() => void setSelectedTask(undefined).catch(console.error)} type="button">
          x
        </button>
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
        <span>截止日期</span>
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
        <input
          aria-describedby={tagError ? 'task-detail-tag-error' : undefined}
          onBlur={() => void saveTags()}
          onChange={(event) => setTagText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur()
            }
          }}
          placeholder="设计, 跟进"
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
