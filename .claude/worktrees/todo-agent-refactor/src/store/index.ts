import { create } from 'zustand'
import type { Todo, TodoStats } from '../types'
import * as db from '../db'

// Event emitter for cross-framework reactivity (PageAgent tools need to trigger React re-renders)
type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l())
}

export interface TodoStore {
  todos: Todo[]
  stats: TodoStats
  loading: boolean
  error: string | null
  init: () => Promise<void>
  add: (text: string) => Promise<void>
  complete: (id: string) => Promise<void>
  uncomplete: (id: string) => Promise<void>
  delete: (id: string) => Promise<void>
  getByText: (text: string) => Todo | undefined
  subscribe: (listener: Listener) => () => void
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  todos: [],
  stats: { total: 0, completed: 0, completionRate: 0, weeklyCompleted: 0 },
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const todos = await db.getAllTodos()
      const stats = await db.getTodoStats()
      set({ todos, stats, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  add: async (text: string) => {
    const todo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    }
    await db.addTodo(todo)
    const todos = await db.getAllTodos()
    const stats = await db.getTodoStats()
    set({ todos, stats })
    notify()
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
    return get().todos.find((t) => t.text.includes(text))
  },

  subscribe: (listener: Listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}))

// Expose store globally for PageAgent tools
;(globalThis as any).__todoStore = useTodoStore