import { useEffect, useMemo, useRef, useState } from 'react'
import { PRIORITY_LABELS, STATUS_LABELS } from '../../tasks/displayLabels.ts'
import { useTaskStore } from '../../tasks/store.ts'
import type { Tag, TaskPriority, TaskStatus } from '../../tasks/types.ts'
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
  const createTag = useTaskStore((state) => state.createTag)
  const deleteTag = useTaskStore((state) => state.deleteTag)
  const setSelectedTask = useTaskStore((state) => state.setSelectedTask)
  const [titleText, setTitleText] = useState('')
  const [descriptionText, setDescriptionText] = useState('')
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
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

      <div className="task-field">
        <div className="task-field__heading">
          <span>标签</span>
          <button className="task-field__text-button" onClick={() => setTagManagerOpen(true)} type="button">
            管理
          </button>
        </div>
        <select
          aria-label="标签"
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
      </div>

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
      {tagManagerOpen && <TaskTagManagerDialog onClose={() => setTagManagerOpen(false)} onCreateTag={createTag} onDeleteTag={deleteTag} tags={tags} />}
    </aside>
  )
}

function TaskTagManagerDialog({
  onClose,
  onCreateTag,
  onDeleteTag,
  tags,
}: {
  onClose: () => void
  onCreateTag: (name: string) => Promise<Tag>
  onDeleteTag: (id: string) => Promise<void>
  tags: Tag[]
}) {
  const [name, setName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string>()
  const [error, setError] = useState<string>()

  const create = async () => {
    const normalized = name.trim()
    if (!normalized) {
      setError('请输入标签名称。')
      return
    }

    try {
      await onCreateTag(normalized)
      setName('')
      setError(undefined)
    } catch {
      setError('标签创建失败，请重试。')
    }
  }

  const remove = async (tag: Tag) => {
    try {
      await onDeleteTag(tag.id)
      setDeleteConfirmId(undefined)
      setError(undefined)
    } catch {
      setError('标签删除失败，请重试。')
    }
  }

  return (
    <div className="task-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="task-dialog task-tag-manager" aria-label="管理标签" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <h2>管理标签</h2>
          <button aria-label="关闭" type="button" onClick={onClose}>
            x
          </button>
        </header>

        <div className="task-tag-manager__create">
          <input
            aria-label="新标签名称"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void create()
              }
            }}
            placeholder="新标签名称"
            type="text"
            value={name}
          />
          <button type="button" onClick={() => void create()}>
            创建
          </button>
        </div>

        {error && (
          <div className="task-tag-manager__error" role="alert">
            {error}
          </div>
        )}

        <div className="task-tag-manager__list">
          {tags.length === 0 ? (
            <span className="task-detail-panel__empty">暂无标签</span>
          ) : (
            tags.map((tag) => (
              <div className="task-tag-manager__row" key={tag.id}>
                <span className="task-tag-manager__color" style={{ background: tag.color }} />
                <span>{tag.name}</span>
                {deleteConfirmId === tag.id ? (
                  <span className="task-tag-manager__confirm">
                    <span>确认删除?</span>
                    <button type="button" onClick={() => void remove(tag)}>
                      删除
                    </button>
                    <button type="button" onClick={() => setDeleteConfirmId(undefined)}>
                      取消
                    </button>
                  </span>
                ) : (
                  <button className="task-tag-manager__delete" type="button" onClick={() => setDeleteConfirmId(tag.id)}>
                    删除
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
