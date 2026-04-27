import { useTodoStore } from '../store/index.ts'
import { z } from 'zod'
import * as db from '../db/index.ts'
import { TAG_COLORS } from '../db/index.ts'
import type { Tag } from '../types/index.ts'

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
    inputSchema: z.object({
      text: z.string(),
      priority: z.enum(['high', 'medium', 'low']).optional(),
      dueDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    execute: async (input: unknown) => {
      const { text, priority, dueDate, tags: tagNames, description } = input as {
        text: string; priority?: 'high' | 'medium' | 'low'; dueDate?: string
        tags?: string[]; description?: string
      }
      const store = useTodoStore.getState()
      const extra: any = {}
      if (priority) extra.priority = priority
      if (dueDate) extra.dueDate = new Date(dueDate).getTime()
      if (description) extra.description = description
      const todo = await store.add(text, extra)

      if (tagNames) {
        for (const name of tagNames) {
          let tag = store.tags.find((t: Tag) => t.name === name)
          if (!tag) {
            const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
            tag = await store.addTag(name, color)
          }
          await store.addTagToTodo(todo.id, tag.id)
        }
      }

      const parts = []
      if (priority) parts.push(`priority: ${priority}`)
      if (tagNames && tagNames.length > 0) parts.push(`tags: ${tagNames.join(', ')}`)
      const meta = parts.length > 0 ? ` (${parts.join(', ')})` : ''
      return `Created TODO: "${text}"${meta}`
    },
  },

  todo_complete: {
    name: 'todo_complete',
    description: 'Mark a TODO as completed by id',
    inputSchema: z.object({ id: z.string() }),
    execute: async (input: unknown) => {
      const { id } = input as { id: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.todos.find((t) => t.id === id)
      if (!todo) return `No TODO found with id: "${id}"`
      await store.complete(todo.id)
      return `Completed: "${todo.text}"`
    },
  },

  todo_uncomplete: {
    name: 'todo_uncomplete',
    description: 'Re-open a completed TODO by id',
    inputSchema: z.object({ id: z.string() }),
    execute: async (input: unknown) => {
      const { id } = input as { id: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.todos.find((t) => t.id === id)
      if (!todo) return `No TODO found with id: "${id}"`
      await store.uncomplete(todo.id)
      return `Re-opened: "${todo.text}"`
    },
  },

  todo_delete: {
    name: 'todo_delete',
    description: 'Delete a TODO by id',
    inputSchema: z.object({ id: z.string() }),
    execute: async (input: unknown) => {
      const { id } = input as { id: string }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      const todo = store.todos.find((t) => t.id === id)
      if (!todo) return `No TODO found with id: "${id}"`
      await store.delete(todo.id)
      return `Deleted: "${todo.text}"`
    },
  },

  todo_update: {
    name: 'todo_update',
    description: 'Update TODO fields by id (text, priority, dueDate, tags, description, completed)',
    inputSchema: z.object({
      id: z.string(),
      text: z.string().optional(),
      priority: z.enum(['high', 'medium', 'low']).optional(),
      dueDate: z.string().nullable().optional(),
      tags: z.array(z.string()).nullable().optional(),
      description: z.string().optional(),
      completed: z.boolean().optional(),
    }),
    execute: async (input: unknown) => {
      const { id, text, priority, dueDate, tags: tagNames, description, completed } = input as {
        id: string;
        text?: string;
        priority?: 'high' | 'medium' | 'low';
        dueDate?: string | null;
        tags?: string[] | null;
        description?: string;
        completed?: boolean;
      }
      const store = useTodoStore.getState()
      const todo = store.todos.find((t) => t.id === id)
      if (!todo) return `No TODO found with id: "${id}"`

      const updated: any = { ...todo }
      if (text !== undefined) updated.text = text
      if (priority !== undefined) updated.priority = priority
      if (dueDate != null) updated.dueDate = new Date(dueDate).getTime()
      if (description !== undefined) updated.description = description
      if (completed !== undefined) {
        updated.completed = completed
        updated.completedAt = completed ? Date.now() : undefined
      }

      await db.updateTodo(updated)

      if (tagNames != null) {
        await store.setTodoTags(todo.id, [])
        for (const name of tagNames) {
          const tag = store.tags.find((t: Tag) => t.name === name)
          if (tag) await store.addTagToTodo(todo.id, tag.id)
        }
      }

      await store.init()
      return `Updated: "${todo.text}"`
    },
  },

  todo_list: {
    name: 'todo_list',
    description: 'List all TODOs, filter by status/priority/tags/overdue/dates',
    inputSchema: z.object({
      status: z.enum(['all', 'active', 'completed']).optional(),
      priority: z.enum(['all', 'high', 'medium', 'low']).optional(),
      tags: z.array(z.string()).optional(),
      overdue: z.enum(['all', 'yes', 'no']).optional(),
      dueDateStart: z.string().nullable().optional(),
      dueDateEnd: z.string().nullable().optional(),
      completedDateStart: z.string().nullable().optional(),
      completedDateEnd: z.string().nullable().optional(),
    }),
    execute: async (input: unknown) => {
      const { status, priority, tags, overdue, dueDateStart, dueDateEnd, completedDateStart, completedDateEnd } = input as {
        status?: 'all' | 'active' | 'completed'
        priority?: 'all' | 'high' | 'medium' | 'low'
        tags?: string[]
        overdue?: 'all' | 'yes' | 'no'
        dueDateStart?: string | null
        dueDateEnd?: string | null
        completedDateStart?: string | null
        completedDateEnd?: string | null
      }
      const store = useTodoStore.getState()
      if (!store) return 'Error: TodoStore not initialized'
      let todos = store.todos

      const now = Date.now()

      // status 筛选
      if (status === 'active') {
        todos = todos.filter((t: any) => !t.completed)
      } else if (status === 'completed') {
        todos = todos.filter((t: any) => t.completed)
      }

      // priority 筛选
      if (priority && priority !== 'all') {
        todos = todos.filter((t: any) => t.priority === priority)
      }

      // tags 筛选 (AND 逻辑)
      if (tags && tags.length > 0) {
        const filtered: any[] = []
        for (const t of todos) {
          const tagIds = await db.getTodoTags(t.id)
          const todoTags = await db.getTagsByIds(tagIds)
          const todoTagNames = todoTags.map((tag: Tag) => tag.name)
          if (tags.every((tagName) => todoTagNames.includes(tagName))) {
            filtered.push(t)
          }
        }
        todos = filtered
      }

      // overdue 筛选
      if (overdue === 'yes') {
        todos = todos.filter((t: any) => !t.completed && t.dueDate && t.dueDate < now)
      } else if (overdue === 'no') {
        todos = todos.filter((t: any) => t.completed || !t.dueDate || t.dueDate >= now)
      }

      // dueDate 范围筛选
      if (dueDateStart) {
        const start = new Date(dueDateStart).getTime()
        todos = todos.filter((t: any) => t.dueDate && t.dueDate >= start)
      }
      if (dueDateEnd) {
        const end = new Date(dueDateEnd).getTime() + 86400000
        todos = todos.filter((t: any) => t.dueDate && t.dueDate < end)
      }

      // completedDate 范围筛选
      if (completedDateStart) {
        const start = new Date(completedDateStart).getTime()
        todos = todos.filter((t: any) => t.completedAt && t.completedAt >= start)
      }
      if (completedDateEnd) {
        const end = new Date(completedDateEnd).getTime() + 86400000
        todos = todos.filter((t: any) => t.completedAt && t.completedAt < end)
      }

      if (todos.length === 0) return 'No TODOs found'
      const lines = await Promise.all(
        todos.map(async (t) => {
          const tagIds = await db.getTodoTags(t.id)
          const tags = await db.getTagsByIds(tagIds)
          const tagStr = tags.map((tag: Tag) => tag.name).join(', ')
          const prioStr = t.priority ? `优先级: ${t.priority}` : ''
          const tagLine = tagStr ? `标签: ${tagStr}` : ''
          const dueStr = t.dueDate ? `截止: ${new Date(t.dueDate).toLocaleDateString('zh-CN')}` : ''
          const descStr = t.description ? `描述: ${t.description}` : ''
          const meta = [prioStr, tagLine, dueStr, descStr].filter(Boolean).join(' | ')
          return `[id: ${t.id}] [${t.completed ? 'x' : ' '}] ${t.text}${meta ? ' | ' + meta : ''}`
        })
      )
      return lines.join('\n')
    },
  },

  get_date_range: {
    name: 'get_date_range',
    description: '获取日期范围，用于筛选',
    inputSchema: z.object({
      period: z.enum(['day', 'week', 'month']),
    }),
    execute: async (input: unknown) => {
      const { period } = input as { period: 'day' | 'week' | 'month' }
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const date = now.getDate()
      const dayOfWeek = now.getDay() || 7 // 0=Sun -> 7

      const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      if (period === 'day') {
        const start = new Date(year, month, date)
        return JSON.stringify({
          start: toLocalDateStr(start),
          end: toLocalDateStr(start),
        })
      }

      if (period === 'week') {
        const monday = new Date(now)
        monday.setDate(date - dayOfWeek + 1)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)
        return JSON.stringify({
          start: toLocalDateStr(monday),
          end: toLocalDateStr(sunday),
        })
      }

      if (period === 'month') {
        const start = new Date(year, month, 1)
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
        return JSON.stringify({
          start: toLocalDateStr(start),
          end: toLocalDateStr(end),
        })
      }

      return ''
    },
  },

  tag_create: {
    name: 'tag_create',
    description: 'Create a new tag',
    inputSchema: z.object({
      name: z.string(),
      color: z.string().optional(),
    }),
    execute: async (input: unknown) => {
      const { name, color } = input as { name: string; color?: string }
      const store = useTodoStore.getState()
      const existing = store.tags.find((t: Tag) => t.name === name)
      if (existing) return `Tag "${name}" already exists`
      const tagColor = color && TAG_COLORS.includes(color) ? color : TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)]
      await store.addTag(name, tagColor)
      return `Created tag: ${name} (${tagColor})`
    },
  },

  tag_delete: {
    name: 'tag_delete',
    description: 'Delete a tag (removes from all todos)',
    inputSchema: z.object({ name: z.string() }),
    execute: async (input: unknown) => {
      const { name } = input as { name: string }
      const store = useTodoStore.getState()
      const tag = store.tags.find((t: Tag) => t.name === name)
      if (!tag) return `Tag "${name}" not found`
      await store.deleteTag(tag.id)
      return `Deleted tag: ${name}`
    },
  },
}
