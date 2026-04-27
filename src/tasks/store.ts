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

function notifyExternal(): void {
  listeners.forEach((listener) => listener())
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

  createTask: async (input) => {
    const task = createTaskModel(input)
    await db.addTaskRecord(task)
    set((state) => ({
      tasks: [...state.tasks.filter((item) => item.id !== task.id), task],
      error: null,
    }))
    notifyExternal()
    return task
  },

  updateTask: async (id, updates) => {
    const task = get().tasks.find((item) => item.id === id)
    if (!task) {
      return undefined
    }

    const updated = updateTaskModel(task, updates)
    await db.updateTaskRecord(updated)
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === id ? updated : item)),
      error: null,
    }))
    notifyExternal()
    return updated
  },

  deleteTask: async (id) => {
    await db.deleteTaskRecord(id)
    set((state) => ({
      tasks: state.tasks.filter((task) => task.id !== id),
      selectedTaskId: state.selectedTaskId === id ? undefined : state.selectedTaskId,
      error: null,
    }))
    notifyExternal()
  },

  completeTask: (id) => get().updateTask(id, { status: 'done' }),

  createTag: async (name) => {
    const normalizedName = name.trim()
    const existingTag = get().tags.find((tag) => tag.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())
    if (existingTag) {
      return existingTag
    }

    const tag: Tag = {
      id: crypto.randomUUID(),
      name: normalizedName,
      color: TAG_COLORS[get().tags.length % TAG_COLORS.length],
    }

    await db.addTagRecord(tag)
    set((state) => ({
      tags: [...state.tags.filter((item) => item.id !== tag.id), tag],
      error: null,
    }))
    notifyExternal()
    return tag
  },

  updateView: async (view) => {
    await db.updateViewRecord(view)
    set((state) => ({
      views: [...state.views.filter((item) => item.id !== view.id), view],
      error: null,
    }))
    notifyExternal()
    return view
  },

  setActiveView: async (viewId) => {
    await db.setActiveViewId(viewId)
    set({ activeViewId: viewId, error: null })
    notifyExternal()
  },

  setSelectedTask: async (taskId) => {
    await db.setSelectedTaskId(taskId)
    set({ selectedTaskId: taskId, error: null })
    notifyExternal()
  },

  getPreparedTasks: (viewId) => {
    const state = get()
    const view = state.views.find((item) => item.id === (viewId ?? state.activeViewId))
    if (!view) {
      return state.tasks
    }

    return applySorts(applyFilters(state.tasks, view.filters), view.sorts)
  },

  getSummary: () => getTaskSummary(get().tasks),

  subscribeExternal: (listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}))

;(globalThis as typeof globalThis & { __taskStore?: typeof useTaskStore }).__taskStore = useTaskStore
