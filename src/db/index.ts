import { openDB, type IDBPDatabase } from 'idb'
import type { Todo, TodoStats } from '../types'

const DB_NAME = 'todo-db'
const STORE_NAME = 'todos'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
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
