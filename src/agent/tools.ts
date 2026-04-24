import { tool } from 'page-agent'
import { useTodoStore } from '../store'
import { z } from 'zod'

function getStore() {
  return (globalThis as any).__todoStore as ReturnType<typeof useTodoStore.getState> | undefined
}

export const todoTools = {
  todo_create: tool({
    description: 'Create a new TODO item',
    inputSchema: z.object({ text: z.string() }),
    execute: async function(this: any, input: { text: string }) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      await store.add(input.text)
      return `Created TODO: "${input.text}"`
    },
  }),

  todo_complete: tool({
    description: 'Mark a TODO as completed by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async function(this: any, input: { text: string }) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(input.text)
      if (!todo) return `No TODO found matching: "${input.text}"`
      await store.complete(todo.id)
      return `Completed: "${todo.text}"`
    },
  }),

  todo_uncomplete: tool({
    description: 'Re-open a completed TODO by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async function(this: any, input: { text: string }) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(input.text)
      if (!todo) return `No TODO found matching: "${input.text}"`
      await store.uncomplete(todo.id)
      return `Re-opened: "${todo.text}"`
    },
  }),

  todo_delete: tool({
    description: 'Delete a TODO by text match',
    inputSchema: z.object({ text: z.string() }),
    execute: async function(this: any, input: { text: string }) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.getByText(input.text)
      if (!todo) return `No TODO found matching: "${input.text}"`
      await store.delete(todo.id)
      return `Deleted: "${todo.text}"`
    },
  }),

  todo_list: tool({
    description: 'List all TODOs, optionally filtered by status',
    inputSchema: z.object({ status: z.string().optional() }),
    execute: async function(this: any, input: { status?: string }) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      let todos = store.todos
      if (input.status === 'completed') {
        todos = todos.filter((t: any) => t.completed)
      } else if (input.status === 'active') {
        todos = todos.filter((t: any) => !t.completed)
      }
      if (todos.length === 0) return 'No TODOs found'
      return todos
        .map((t: any) => `[${t.completed ? 'x' : ' '}] ${t.text}`)
        .join('\n')
    },
  }),

  todo_stats: tool({
    description: "Get today's statistics",
    inputSchema: z.object({}),
    execute: async function(this: any) {
      const store = getStore()
      if (!store) return 'Error: TodoStore not initialized'
      const s = store.stats
      return `Today: ${s.completed}/${s.total} completed (${s.completionRate}%). This week: ${s.weeklyCompleted} completed.`
    },
  }),

  todo_get_weekly_report: tool({
    description: "Get this week's completed tasks for report generation",
    inputSchema: z.object({}),
    execute: async function(this: any) {
      const store = getStore()
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
  }),
}
