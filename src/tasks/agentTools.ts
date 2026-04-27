import { z } from 'zod'
import { useTaskStore } from './store.ts'
import type { Tag, Task, TaskPriority, TaskStatus, ViewDefinition } from './types.ts'

const taskStatusSchema = z.enum(['todo', 'doing', 'done', 'blocked'])
const taskListStatusSchema = z.enum(['all', 'todo', 'doing', 'done', 'blocked'])
const taskPrioritySchema = z.enum(['urgent', 'high', 'medium', 'low'])
const taskListPrioritySchema = z.enum(['all', 'urgent', 'high', 'medium', 'low'])
const viewTypeSchema = z.enum(['grid', 'kanban', 'calendar'])
const fieldIdSchema = z.enum(['title', 'status', 'priority', 'tagIds', 'dueDate', 'completedAt', 'description', 'createdAt'])
const filterOperatorSchema = z.enum(['is', 'isNot', 'contains', 'isEmpty', 'isNotEmpty', 'before', 'after', 'between'])
const sortDirectionSchema = z.enum(['asc', 'desc'])
const filterRuleSchema = z.object({
  fieldId: fieldIdSchema,
  operator: filterOperatorSchema,
  value: z.unknown().optional(),
})
const sortRuleSchema = z.object({
  fieldId: fieldIdSchema,
  direction: sortDirectionSchema,
})
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}, 'Expected a valid YYYY-MM-DD date')
const limitSchema = z.number().int().positive().max(100).optional()

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
      dueDate: dateSchema.optional(),
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
      dueDate: dateSchema.nullable().optional(),
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
      status: taskListStatusSchema.optional(),
      priority: taskListPrioritySchema.optional(),
      tags: z.array(z.string()).optional(),
      dueDate: dateSchema.nullable().optional(),
      limit: limitSchema,
    }),
    execute: async (args) => {
      const input = listTasksInputSchema.parse(args)
      const tasks = filterTasks(useTaskStore.getState().tasks, input).slice(0, input.limit)
      return formatTaskList(tasks)
    },
  },

  filter_tasks: {
    name: 'filter_tasks',
    description: 'Filter tasks by structured status, priority, tag names, due date, overdue state, and optional limit.',
    inputSchema: z.object({
      status: taskListStatusSchema.optional(),
      priority: taskListPrioritySchema.optional(),
      tags: z.array(z.string()).optional(),
      dueDate: dateSchema.nullable().optional(),
      overdue: z.boolean().optional(),
      limit: limitSchema,
    }),
    execute: async (args) => {
      const input = filterTasksInputSchema.parse(args)
      const tasks = filterTasks(useTaskStore.getState().tasks, input).slice(0, input.limit)
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

  create_tag: {
    name: 'create_tag',
    description: 'Create or reuse a tag by name.',
    inputSchema: z.object({ name: z.string() }),
    execute: async (args) => {
      const { name } = createTagInputSchema.parse(args)
      const tag = await useTaskStore.getState().createTag(name)
      return `Tag: "${tag.name}" [id: ${tag.id}] | color: ${tag.color}`
    },
  },

  update_view: {
    name: 'update_view',
    description: 'Update the active or specified view with validated type, filters, sorts, group field, and visible fields.',
    inputSchema: z.object({
      id: z.string().optional(),
      type: viewTypeSchema.optional(),
      filters: z.array(filterRuleSchema).optional(),
      sorts: z.array(sortRuleSchema).optional(),
      groupBy: fieldIdSchema.nullable().optional(),
      visibleFieldIds: z.array(fieldIdSchema).optional(),
    }),
    execute: async (args) => {
      const input = updateViewInputSchema.parse(args)
      const state = useTaskStore.getState()
      const viewId = input.id ?? state.activeViewId
      const existingView = state.views.find((view) => view.id === viewId)
      if (!existingView) {
        return `No view found with id: "${viewId}"`
      }

      const view: ViewDefinition = {
        ...existingView,
        ...(input.type ? { type: input.type } : {}),
        ...(input.filters ? { filters: input.filters } : {}),
        ...(input.sorts ? { sorts: input.sorts } : {}),
        ...(input.visibleFieldIds ? { visibleFieldIds: input.visibleFieldIds } : {}),
        ...(input.groupBy !== undefined ? (input.groupBy === null ? { groupBy: undefined } : { groupBy: input.groupBy }) : {}),
      }

      const updatedView = await useTaskStore.getState().updateView(view)
      return `Updated view: "${updatedView.name}" [id: ${updatedView.id}] | type: ${updatedView.type}`
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
  dueDate: z.ZodOptional<typeof dateSchema>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
  description: z.ZodOptional<z.ZodString>
}>

const updateTaskInputSchema = taskTools.update_task.inputSchema as z.ZodObject<{
  id: z.ZodString
  title: z.ZodOptional<z.ZodString>
  status: z.ZodOptional<typeof taskStatusSchema>
  priority: z.ZodOptional<typeof taskPrioritySchema>
  dueDate: z.ZodOptional<z.ZodNullable<typeof dateSchema>>
  description: z.ZodOptional<z.ZodNullable<z.ZodString>>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
}>

const idInputSchema = z.object({ id: z.string() })
const listTasksInputSchema = taskTools.list_tasks.inputSchema as z.ZodObject<{
  status: z.ZodOptional<typeof taskListStatusSchema>
  priority: z.ZodOptional<typeof taskListPrioritySchema>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
  dueDate: z.ZodOptional<z.ZodNullable<typeof dateSchema>>
  limit: typeof limitSchema
}>
const filterTasksInputSchema = taskTools.filter_tasks.inputSchema as z.ZodObject<{
  status: z.ZodOptional<typeof taskListStatusSchema>
  priority: z.ZodOptional<typeof taskListPrioritySchema>
  tags: z.ZodOptional<z.ZodArray<z.ZodString>>
  dueDate: z.ZodOptional<z.ZodNullable<typeof dateSchema>>
  overdue: z.ZodOptional<z.ZodBoolean>
  limit: typeof limitSchema
}>
const searchTasksInputSchema = z.object({ query: z.string() })
const createTagInputSchema = taskTools.create_tag.inputSchema as z.ZodObject<{
  name: z.ZodString
}>
const updateViewInputSchema = taskTools.update_view.inputSchema as z.ZodObject<{
  id: z.ZodOptional<z.ZodString>
  type: z.ZodOptional<typeof viewTypeSchema>
  filters: z.ZodOptional<z.ZodArray<typeof filterRuleSchema>>
  sorts: z.ZodOptional<z.ZodArray<typeof sortRuleSchema>>
  groupBy: z.ZodOptional<z.ZodNullable<typeof fieldIdSchema>>
  visibleFieldIds: z.ZodOptional<z.ZodArray<typeof fieldIdSchema>>
}>
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
    overdue?: boolean
  }
): Task[] {
  const today = new Date().toISOString().slice(0, 10)

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

    if (input.overdue !== undefined) {
      const overdue = Boolean(task.dueDate && task.dueDate < today && task.status !== 'done')
      if (overdue !== input.overdue) {
        return false
      }
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
