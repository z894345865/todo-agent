import { z } from 'zod'
import { useTaskStore } from './store.ts'
import type { Tag, Task, TaskPriority, TaskStatus } from './types.ts'

const taskStatusSchema = z.enum(['todo', 'doing', 'done', 'blocked'])
const taskPrioritySchema = z.enum(['urgent', 'high', 'medium', 'low'])

export interface Tool {
  name: string
  description: string
  inputSchema: z.ZodType
  execute: (args: unknown) => Promise<string>
}

export const taskTools: Record<string, Tool> = {
  create_task: {
    name: 'create_task',
    description: 'Create a structured task with optional status, priority, due date, tags, and description.',
    inputSchema: z.object({
      title: z.string(),
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      dueDate: z.string().optional(),
      tags: z.array(z.string()).optional(),
      description: z.string().optional(),
    }),
    execute: async (args) => {
      const input = createTaskInputSchema.parse(args)
      const tagIds = await getOrCreateTagIds(input.tags)
      const task = await useTaskStore.getState().createTask({
        title: input.title,
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        tagIds,
      })
      const tags = getTagsForTask(task)
      return `Created task: "${task.title}" [id: ${task.id}]${formatTaskMeta(task, tags)}`
    },
  },

  update_task: {
    name: 'update_task',
    description: 'Update a task by id. Supports title, status, priority, nullable due date, nullable description, and replacement tags.',
    inputSchema: z.object({
      id: z.string(),
      title: z.string().optional(),
      status: taskStatusSchema.optional(),
      priority: taskPrioritySchema.optional(),
      dueDate: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      tags: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      const input = updateTaskInputSchema.parse(args)
      const existing = useTaskStore.getState().tasks.find((task) => task.id === input.id)
      if (!existing) {
        return `No task found with id: "${input.id}"`
      }

      const updates: Partial<Omit<Task, 'id' | 'createdAt'>> = {}
      if (input.title !== undefined) updates.title = input.title
      if (input.status !== undefined) updates.status = input.status
      if (input.priority !== undefined) updates.priority = input.priority
      if (input.dueDate !== undefined) updates.dueDate = input.dueDate ?? undefined
      if (input.description !== undefined) updates.description = input.description ?? undefined
      if (input.tags !== undefined) updates.tagIds = await getOrCreateTagIds(input.tags)

      const task = await useTaskStore.getState().updateTask(input.id, updates)
      if (!task) {
        return `No task found with id: "${input.id}"`
      }

      const tags = getTagsForTask(task)
      return `Updated task: "${task.title}" [id: ${task.id}]${formatTaskMeta(task, tags)}`
    },
  },

  delete_task: {
    name: 'delete_task',
    description: 'Delete a task by id.',
    inputSchema: z.object({ id: z.string() }),
    execute: async (args) => {
      const { id } = idInputSchema.parse(args)
      const task = useTaskStore.getState().tasks.find((item) => item.id === id)
      if (!task) {
        return `No task found with id: "${id}"`
      }

      await useTaskStore.getState().deleteTask(id)
      return `Deleted task: "${task.title}" [id: ${id}]`
    },
  },

  complete_task: {
    name: 'complete_task',
    description: 'Mark a task done by id.',
    inputSchema: z.object({ id: z.string() }),
    execute: async (args) => {
      const { id } = idInputSchema.parse(args)
      const existing = useTaskStore.getState().tasks.find((task) => task.id === id)
      if (!existing) {
        return `No task found with id: "${id}"`
      }

      const task = await useTaskStore.getState().completeTask(id)
      if (!task) {
        return `No task found with id: "${id}"`
      }

      return `Completed task: "${task.title}" [id: ${task.id}]`
    },
  },

  list_tasks: {
    name: 'list_tasks',
    description: 'List tasks with optional status, priority, tag, and due date filters.',
    inputSchema: z.object({
      status: z.union([taskStatusSchema, z.literal('all')]).optional(),
      priority: z.union([taskPrioritySchema, z.literal('all')]).optional(),
      tags: z.array(z.string()).optional(),
      dueDate: z.string().nullable().optional(),
    }),
    execute: async (args) => {
      const input = listTasksInputSchema.parse(args)
      const tasks = filterTasks(useTaskStore.getState().tasks, input)
      return formatTaskList(tasks)
    },
  },

  search_tasks: {
    name: 'search_tasks',
    description: 'Search tasks by title, description, status, priority, due date, or tag name.',
    inputSchema: z.object({ query: z.string() }),
    execute: async (args) => {
      const { query } = searchTasksInputSchema.parse(args)
      const normalizedQuery = query.trim().toLocaleLowerCase()
      if (!normalizedQuery) {
        return 'No tasks found'
      }

      const tasks = useTaskStore.getState().tasks.filter((task) => {
        const tags = getTagsForTask(task)
        const haystack = [task.title, task.status, task.priority, task.dueDate, task.description, ...tags.map((tag) => tag.name)]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase()
        return haystack.includes(normalizedQuery)
      })
      return formatTaskList(tasks)
    },
  },

  get_task_summary: {
    name: 'get_task_summary',
    description: 'Get total, active, completed, overdue, due today, status, and priority task counts.',
    inputSchema: z.object({}),
    execute: async (args) => {
      summaryInputSchema.parse(args)
      const summary = useTaskStore.getState().getSummary()
      return [
        `Total: ${summary.total}`,
        `Active: ${summary.active}`,
        `Completed: ${summary.completed}`,
        `Overdue: ${summary.overdue}`,
        `Due today: ${summary.dueToday}`,
        `Status: todo ${summary.byStatus.todo}, doing ${summary.byStatus.doing}, done ${summary.byStatus.done}, blocked ${summary.byStatus.blocked}`,
        `Priority: urgent ${summary.byPriority.urgent}, high ${summary.byPriority.high}, medium ${summary.byPriority.medium}, low ${summary.byPriority.low}`,
      ].join('\n')
    },
  },
}

const createTaskInputSchema = taskTools.create_task.inputSchema as z.ZodObject<{
  title: z.ZodString
  status: z.ZodOptional<typeof taskStatusSchema>
  priority: z.ZodOptional<typeof taskPrioritySchema>
  dueDate: z.ZodOptional<z.ZodString>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
  description: z.ZodOptional<z.ZodString>
}>

const updateTaskInputSchema = taskTools.update_task.inputSchema as z.ZodObject<{
  id: z.ZodString
  title: z.ZodOptional<z.ZodString>
  status: z.ZodOptional<typeof taskStatusSchema>
  priority: z.ZodOptional<typeof taskPrioritySchema>
  dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>
  description: z.ZodOptional<z.ZodNullable<z.ZodString>>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
}>

const idInputSchema = z.object({ id: z.string() })
const listTasksInputSchema = taskTools.list_tasks.inputSchema as z.ZodObject<{
  status: z.ZodOptional<z.ZodUnion<[typeof taskStatusSchema, z.ZodLiteral<'all'>]>>
  priority: z.ZodOptional<z.ZodUnion<[typeof taskPrioritySchema, z.ZodLiteral<'all'>]>>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
  dueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>
}>
const searchTasksInputSchema = z.object({ query: z.string() })
const summaryInputSchema = z.object({})

async function getOrCreateTagIds(tagNames: string[] | undefined): Promise<string[]> {
  if (!tagNames || tagNames.length === 0) {
    return []
  }

  const tagIds: string[] = []
  for (const rawName of tagNames) {
    const name = rawName.trim()
    if (!name) {
      continue
    }

    const tag = await useTaskStore.getState().createTag(name)
    tagIds.push(tag.id)
  }
  return tagIds
}

function filterTasks(
  tasks: Task[],
  input: {
    status?: TaskStatus | 'all'
    priority?: TaskPriority | 'all'
    tags?: string[]
    dueDate?: string | null
  }
): Task[] {
  return tasks.filter((task) => {
    if (input.status && input.status !== 'all' && task.status !== input.status) {
      return false
    }

    if (input.priority && input.priority !== 'all' && task.priority !== input.priority) {
      return false
    }

    if (input.dueDate !== undefined && input.dueDate !== null && task.dueDate !== input.dueDate) {
      return false
    }

    if (input.tags && input.tags.length > 0) {
      const taskTagNames = getTagsForTask(task).map((tag) => tag.name.toLocaleLowerCase())
      return input.tags.every((tagName) => taskTagNames.includes(tagName.toLocaleLowerCase()))
    }

    return true
  })
}

function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) {
    return 'No tasks found'
  }

  return tasks.map((task) => `[id: ${task.id}] ${task.title}${formatTaskMeta(task, getTagsForTask(task))}`).join('\n')
}

function formatTaskMeta(task: Task, tags: Tag[]): string {
  const parts = [`status: ${task.status}`, `priority: ${task.priority}`]
  if (task.dueDate) parts.push(`due: ${task.dueDate}`)
  if (tags.length > 0) parts.push(`tags: ${tags.map((tag) => tag.name).join(', ')}`)
  if (task.description) parts.push(`description: ${task.description}`)
  return ` | ${parts.join(' | ')}`
}

function getTagsForTask(task: Task): Tag[] {
  const tags = useTaskStore.getState().tags
  return task.tagIds.map((tagId) => tags.find((tag) => tag.id === tagId)).filter((tag): tag is Tag => Boolean(tag))
}
