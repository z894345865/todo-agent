import { create } from 'zustand'
import type { Todo, TodoStats, Tag } from '../types/index.ts'
import * as db from '../db/index.ts'
import { createClientId } from '../utils/id.ts'

// Event emitter for cross-framework reactivity (PageAgent tools need to trigger React re-renders)
type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l())
}

export interface TodoStore {
  todos: Todo[]
  tags: Tag[]
  stats: TodoStats
  loading: boolean
  error: string | null
  init: () => Promise<void>
  add: (text: string, extra?: Partial<Todo>) => Promise<Todo>
  complete: (id: string) => Promise<void>
  uncomplete: (id: string) => Promise<void>
  delete: (id: string) => Promise<void>
  getByText: (text: string) => Todo | undefined
  addTag: (name: string, color: string) => Promise<Tag>
  updateTag: (id: string, name: string, color: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  addTagToTodo: (todoId: string, tagId: string) => Promise<void>
  setTodoTags: (todoId: string, tagIds: string[]) => Promise<void>
  subscribe: (listener: Listener) => () => void
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  tags: [],
  stats: { total: 0, completed: 0, completionRate: 0, weeklyCompleted: 0, priorityStats: { high: 0, medium: 0, low: 0 }, overdueCount: 0 },
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const todos = await db.getAllTodos()
      const tags = await db.getAllTags()
      const stats = await db.getTodoStats()
      set({ todos, tags, loading: false, stats })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  add: async (text: string, extra?: Partial<Todo>) => {
    const todo: Todo = {
      id: createClientId(),
      text,
      completed: false,
      createdAt: Date.now(),
      ...extra,
    }
    await db.addTodo(todo)
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    set({ todos, stats })
    notify()
    return todo
  },

  complete: async (id: string) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    const updated = { ...todo, completed: true, completedAt: Date.now() }
    await db.updateTodo(updated)
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    set({ todos, stats })
    notify()
  },

  uncomplete: async (id: string) => {
    const todo = get().todos.find((t) => t.id === id)
    if (!todo) return
    const updated = { ...todo, completed: false, completedAt: undefined }
    await db.updateTodo(updated)
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    set({ todos, stats })
    notify()
  },

  delete: async (id: string) => {
    await db.deleteTodo(id)
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    set({ todos, stats })
    notify()
  },

  getByText: (text: string) => {
    return get().todos.find((t) => t.text === text)
  },

  addTag: async (name: string, color: string) => {
    const tag: Tag = { id: createClientId(), name, color }
    await db.addTag(tag)
    const tags = await db.getAllTags()
    set({ tags })
    notify()
    return tag
  },

  updateTag: async (id: string, name: string, color: string) => {
    const existingTag = get().tags.find((t) => t.id === id)
    if (!existingTag) return
    const updated: Tag = { ...existingTag, name, color }
    await db.updateTag(updated)
    const tags = await db.getAllTags()
    set({ tags })
    notify()
  },

  deleteTag: async (id: string) => {
    // Remove this tag from all todos that have it
    const todos = get().todos
    for (const todo of todos) {
      const tagIds = await db.getTodoTags(todo.id)
      if (tagIds.includes(id)) {
        await db.removeTodoTag(todo.id, id)
      }
    }
    await db.deleteTag(id)
    const tags = await db.getAllTags()
    set({ tags })
    notify()
  },

  addTagToTodo: async (todoId: string, tagId: string) => {
    await db.addTodoTag(todoId, tagId)
    notify()
  },

  setTodoTags: async (todoId: string, tagIds: string[]) => {
    await db.removeAllTodoTags(todoId)
    for (const tagId of tagIds) {
      await db.addTodoTag(todoId, tagId)
    }
    notify()
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}))

// Expose store globally for PageAgent tools
;(globalThis as any).__todoStore = useTodoStore
