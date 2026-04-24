import { openDB, type IDBPDatabase } from 'idb'
import type { Todo, TodoStats, Tag, TodoTag } from '../types'

const DB_NAME = 'todo-db'
const STORE_NAME = 'todos'
const DB_VERSION = 2

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('todo_tags')) {
          db.createObjectStore('todo_tags', { keyPath: 'todoId' })
        }
      },
    })
  }
  return dbPromise
}

export const TAG_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#EC4899', '#06B6D4',
]

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDB()
  return db.getAll('tags')
}

export async function addTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function updateTag(tag: Tag): Promise<void> {
  const db = await getDB()
  await db.put('tags', tag)
}

export async function deleteTag(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tags', id)
}

export async function getTodoTags(todoId: string): Promise<string[]> {
  const db = await getDB()
  const records = await db.getAll('todo_tags') as TodoTag[]
  return records.filter(r => r.todoId === todoId).map(r => r.tagId)
}

export async function addTodoTag(todoId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.put('todo_tags', { todoId, tagId })
}

export async function removeTodoTag(todoId: string, tagId: string): Promise<void> {
  const db = await getDB()
  await db.delete('todo_tags', [todoId, tagId])
}

export async function removeAllTodoTags(todoId: string): Promise<void> {
  const db = await getDB()
  const records = await db.getAll('todo_tags') as TodoTag[]
  const toDelete = records.filter(r => r.todoId === todoId)
  for (const r of toDelete) {
    await db.delete('todo_tags', [r.todoId, r.tagId])
  }
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  const db = await getDB()
  const allTags = await db.getAll('tags') as Tag[]
  return allTags.filter(t => ids.includes(t.id))
}

export async function getAllTodos(): Promise<Todo[]> {
  const db = await getDB()
  return db.getAll(STORE_NAME)
}

export async function addTodo(todo: Todo): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, todo)
}

export async function updateTodo(todo: Todo): Promise<void> {
  const db = await getDB()
  await db.put(STORE_NAME, todo)
}

export async function deleteTodo(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getTodoStats(): Promise<TodoStats> {
  const todos = await getAllTodos()
  const startOfDayMs = new Date().setHours(0, 0, 0, 0)
  const startOfWeekMs = startOfDayMs - new Date(startOfDayMs).getDay() * 86400000

  const completed = todos.filter((t) => t.completed)
  const weeklyCompleted = completed.filter((t) => (t.completedAt ?? 0) >= startOfWeekMs)

  return {
    total: todos.length,
    completed: completed.length,
    completionRate: todos.length > 0 ? Math.round((completed.length / todos.length) * 100) : 0,
    weeklyCompleted: weeklyCompleted.length,
  }
}
