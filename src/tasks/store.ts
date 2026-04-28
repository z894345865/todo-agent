import { create } from 'zustand'
import { TAG_COLORS } from './defaults.ts'
import * as db from './db.ts'
import {
  applyFilters,
  applySorts,
  createTask as createTaskModel,
  getTaskSummary,
  updateTask as updateTaskModel,
} from './model.ts'
import { normalizeTaskData } from './localJsonStore.ts'
import type { FieldDefinition, Tag, Task, TaskSummary, ViewDefinition } from './types.ts'

type Listener = () => void
type TaskInput = Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>> & {
  id?: string
  title: string
  createdAt?: string
  updatedAt?: string
}
type TaskUpdates = Partial<Omit<Task, 'id' | 'createdAt'>>

const listeners = new Set<Listener>()
let writeQueue = Promise.resolve()
let preparedTasksCache:
  | {
      tasks: Task[]
      tags: Tag[]
      view: ViewDefinition | undefined
      viewId: string | undefined
      result: Task[]
    }
  | undefined

function notifyExternal(): void {
  listeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Listener failures are isolated so successful store mutations still resolve.
    }
  })
}

function serializeWrite<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.catch(() => undefined).then(operation)
  writeQueue = result.then(
    () => undefined,
    () => undefined
  )
  return result
}

function cloneView(view: ViewDefinition): ViewDefinition {
  return {
    ...view,
    visibleFieldIds: [...view.visibleFieldIds],
    filters: view.filters.map((filter) => ({ ...filter })),
    sorts: view.sorts.map((sort) => ({ ...sort })),
    ...(view.columnWidths ? { columnWidths: { ...view.columnWidths } } : {}),
  }
}

function applySearch(tasks: Task[], query: string | undefined, tags: Tag[]): Task[] {
  const normalizedQuery = query?.trim().toLocaleLowerCase()
  if (!normalizedQuery) {
    return tasks
  }

  const tagNamesById = new Map(tags.map((tag) => [tag.id, tag.name]))

  return tasks.filter((task) => {
    const tagNames = task.tagIds.map((tagId) => tagNamesById.get(tagId)).filter(Boolean)
    return [task.title, task.description, task.status, task.priority, task.dueDate, ...tagNames]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  })
}

function normalizeViewUpdate(state: TaskStore, view: ViewDefinition): ViewDefinition {
  if (!state.views.some((item) => item.id === view.id)) {
    throw new Error(`No view found with id: "${view.id}"`)
  }

  const data = normalizeTaskData({
    version: 1,
    tasks: state.tasks,
    tags: state.tags,
    fields: state.fields,
    views: state.views.map((item) => (item.id === view.id ? view : item)),
    ui: {
      activeViewId: state.activeViewId,
      ...(state.selectedTaskId ? { selectedTaskId: state.selectedTaskId } : {}),
    },
  })
  const normalized = data.views.find((item) => item.id === view.id)
  if (!normalized) {
    throw new Error(`No view found with id: "${view.id}"`)
  }
  return cloneView(normalized)
}

function normalizeSearchQuery(query: string): string | undefined {
  const normalized = query.trim()
  return normalized ? normalized : undefined
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface TaskStore {
  tasks: Task[]
  tags: Tag[]
  fields: FieldDefinition[]
  views: ViewDefinition[]
  activeViewId: string
  selectedTaskId: string | undefined
  loading: boolean
  error: string | null
  init: () => Promise<void>
  createTask: (input: TaskInput) => Promise<Task>
  updateTask: (id: string, updates: TaskUpdates) => Promise<Task | undefined>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<Task | undefined>
  createTag: (name: string) => Promise<Tag>
  setViewSearchQuery: (viewId: string, query: string) => void
  updateView: (view: ViewDefinition) => Promise<ViewDefinition>
  setActiveView: (viewId: string) => Promise<void>
  setSelectedTask: (taskId: string | undefined) => Promise<void>
  getPreparedTasks: (viewId?: string) => Task[]
  getSummary: () => TaskSummary
  subscribeExternal: (listener: Listener) => () => void
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  tags: [],
  fields: [],
  views: [],
  activeViewId: 'grid-default',
  selectedTaskId: undefined,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const data = await db.getTaskData()
      set({
        tasks: data.tasks,
        tags: data.tags,
        fields: data.fields,
        views: data.views,
        activeViewId: data.ui.activeViewId,
        selectedTaskId: data.ui.selectedTaskId,
        loading: false,
      })
    } catch (error) {
      set({ error: String(error), loading: false })
    }
  },

  createTask: (input) =>
    serializeWrite(async () => {
      const task = createTaskModel(input)
      await db.addTaskRecord(task)
      const data = await db.getTaskData()
      const storedTask = data.tasks.find((item) => item.id === task.id) ?? task
      set({
        tasks: data.tasks,
        selectedTaskId: data.ui.selectedTaskId,
        error: null,
      })
      notifyExternal()
      return storedTask
    }),

  updateTask: (id, updates) =>
    serializeWrite(async () => {
      const latestData = await db.getTaskData()
      const task = latestData.tasks.find((item) => item.id === id)
      if (!task) {
        return undefined
      }

      const updated = updateTaskModel(task, updates)
      await db.updateTaskRecord(updated)
      const data = await db.getTaskData()
      const storedTask = data.tasks.find((item) => item.id === id) ?? updated
      set({
        tasks: data.tasks,
        selectedTaskId: data.ui.selectedTaskId,
        error: null,
      })
      notifyExternal()
      return storedTask
    }),

  deleteTask: (id) =>
    serializeWrite(async () => {
      await db.deleteTaskRecord(id)
      const data = await db.getTaskData()
      set({
        tasks: data.tasks,
        selectedTaskId: data.ui.selectedTaskId,
        error: null,
      })
      notifyExternal()
    }),

  completeTask: (id) => get().updateTask(id, { status: 'done' }),

  createTag: (name) =>
    serializeWrite(async () => {
      try {
        const normalizedName = name.trim()
        if (!normalizedName) {
          throw new Error('tag name is required')
        }

        const data = await db.getTaskData()
        const existingTag = data.tags.find((tag) => tag.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())
        if (existingTag) {
          set({ tags: data.tags, error: null })
          return existingTag
        }

        const tag: Tag = {
          id: crypto.randomUUID(),
          name: normalizedName,
          color: TAG_COLORS[data.tags.length % TAG_COLORS.length],
        }

        await db.addTagRecord(tag)
        const nextData = await db.getTaskData()
        const storedTag = nextData.tags.find((item) => item.id === tag.id) ?? tag
        set({
          tags: nextData.tags,
          error: null,
        })
        notifyExternal()
        return storedTag
      } catch (error) {
        set({ error: getErrorMessage(error) })
        throw error
      }
    }),

  setViewSearchQuery: (viewId, query) => {
    const normalizedQuery = normalizeSearchQuery(query)
    const hasView = get().views.some((view) => view.id === viewId)
    if (!hasView) {
      return
    }

    set({
      views: get().views.map((view) => {
        if (view.id !== viewId) {
          return view
        }
        const next = cloneView(view)
        if (normalizedQuery) {
          next.searchQuery = normalizedQuery
        } else {
          delete next.searchQuery
        }
        return next
      }),
      error: null,
    })
    notifyExternal()
  },

  updateView: (view) => {
    const updated = normalizeViewUpdate(get(), view)
    set({
      views: get().views.map((item) => (item.id === updated.id ? cloneView(updated) : item)),
      error: null,
    })
    notifyExternal()

    return serializeWrite(async () => {
      await db.updateViewRecord(updated)
      set({ error: null })
      return updated
    }).catch((error) => {
      set({ error: getErrorMessage(error) })
      throw error
    })
  },

  setActiveView: (viewId) => {
    const state = get()
    const fallbackViewId = state.views.find((view) => view.id === 'grid-default')?.id ?? state.views[0]?.id ?? 'grid-default'
    const normalizedViewId = viewId.trim() === '' || !state.views.some((view) => view.id === viewId) ? fallbackViewId : viewId
    set({ activeViewId: normalizedViewId, error: null })
    notifyExternal()

    return serializeWrite(async () => {
      await db.setActiveViewId(normalizedViewId)
      set({ error: null })
    }).catch((error) => {
      set({ error: getErrorMessage(error) })
      throw error
    })
  },

  setSelectedTask: (taskId) =>
    serializeWrite(async () => {
      const data = await db.getTaskData()
      const normalizedTaskId = taskId && data.tasks.some((task) => task.id === taskId) ? taskId : undefined
      await db.setSelectedTaskId(normalizedTaskId)
      const nextData = await db.getTaskData()
      set({ selectedTaskId: nextData.ui.selectedTaskId, error: null })
      notifyExternal()
    }),

  getPreparedTasks: (viewId) => {
    const state = get()
    const view = state.views.find((item) => item.id === (viewId ?? state.activeViewId))
    if (!view) {
      return state.tasks
    }

    if (
      preparedTasksCache?.tasks === state.tasks &&
      preparedTasksCache.tags === state.tags &&
      preparedTasksCache.view === view &&
      preparedTasksCache.viewId === viewId
    ) {
      return preparedTasksCache.result
    }

    const result = applySorts(applySearch(applyFilters(state.tasks, view.filters), view.searchQuery, state.tags), view.sorts)
    preparedTasksCache = {
      tasks: state.tasks,
      tags: state.tags,
      view,
      viewId,
      result,
    }
    return result
  },

  getSummary: () => getTaskSummary(get().tasks),

  subscribeExternal: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}))

;(globalThis as typeof globalThis & { __taskStore?: typeof useTaskStore }).__taskStore = useTaskStore
