import { useTodoStore } from '../store'
import { z } from 'zod'

export interface Tool {
  name: string
  description: string
  inputSchema: z.ZodType
  execute: (args: unknown) => Promise<string>
}

export const todoTools: Record<string, Tool> = {
  todo_create: {
    name: 'todo_create',
    description: 'Create a new TODO item',
    inputSchema: z.object({ text: z.string() }),
    execute: async (input: unknown) => {
      const { text } = input as { text: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      await store.add(text)
      return `Created TODO: "${text}"`
    },
  },

  todo_complete: {
    name: 'todo_complete',
    description: 'Mark a TODO as completed by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async (input: unknown) => {
      const { text } = input as { text: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(text)
      if (!todo) return `No TODO found matching: "${text}"`
      await store.complete(todo.id)
      return `Completed: "${todo.text}"`
    },
  },

  todo_uncomplete: {
    name: 'todo_uncomplete',
    description: 'Re-open a completed TODO by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async (input: unknown) => {
      const { text } = input as { text: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(text)
      if (!todo) return `No TODO found matching: "${text}"`
      await store.uncomplete(todo.id)
      return `Re-opened: "${todo.text}"`
    },
  },

  todo_delete: {
    name: 'todo_delete',
    description: 'Delete a TODO by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async (input: unknown) => {
      const { text } = input as { text: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(text)
      if (!todo) return `No TODO found matching: "${text}"`
      await store.delete(todo.id)
      return `Deleted: "${todo.text}"`
    },
  },

  todo_list: {
    name: 'todo_list',
    description: 'List all TODOs, optionally filtered by status',
    inputSchema: z.object({ status: z.string().optional() }),
    execute: async (input: unknown) => {
      const { status } = input as { status?: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      let todos = store.todos
      if (status === 'completed') {
        todos = todos.filter((t: any) => t.completed)
      } else if (status === 'active') {
        todos = todos.filter((t: any) => !t.completed)
      }
      if (todos.length === 0) return 'No TODOs found'
      return todos
        .map((t: any) => `[${t.completed ? 'x' : ' '}] ${t.text}`)
        .join('\n')
    },
  },

  todo_stats: {
    name: 'todo_stats',
    description: "Get today's statistics",
    inputSchema: z.object({}),
    execute: async () => {
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const s = store.stats
      return `Today: ${s.completed}/${s.total} completed (${s.completionRate}%). This week: ${s.weeklyCompleted} completed.`
    },
  },

  todo_get_weekly_report: {
    name: 'todo_get_weekly_report',
    description: "Get this week's completed tasks for report generation",
    inputSchema: z.object({}),
    execute: async () => {
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const startOfDay = new Date().setHours(0, 0, 0, 0)
      const startOfWeek = startOfDay - new Date(startOfDay).getDay() * 86400000
      const completed = store.todos.filter(
        (t: any) => t.completed && (t.completedAt ?? 0) >= startOfWeek
      )
      if (completed.length === 0) return 'No completed tasks this week.'
      return completed
        .map((t: any) => `- ${t.text}`)
        .join('\n')
    },
  },
}
