import { isTauri } from '@tauri-apps/api/core'
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { Todo, Tag } from '../types'
import { readDevDataFile, writeDevDataFile } from './devFileStorage.ts'
import { calculateTodoStats, createEmptyData, normalizeData, type TodoDataFile } from './localJsonStore.ts'

const DATA_FILE = 'todo-data.json'

let dataPromise: Promise<TodoDataFile> | null = null
let memoryData: TodoDataFile = createEmptyData()
let writeQueue = Promise.resolve()

async function readFromDisk(): Promise<TodoDataFile> {
  if (!isTauri()) {
    return (await readDevDataFile()) ?? memoryData
  }

  const fileExists = await exists(DATA_FILE, { baseDir: BaseDirectory.AppData })
  if (!fileExists) {
    const empty = createEmptyData()
    await writeTextFile(DATA_FILE, JSON.stringify(empty, null, 2), { baseDir: BaseDirectory.AppData })
    return empty
  }

  const text = await readTextFile(DATA_FILE, { baseDir: BaseDirectory.AppData })
  try {
    return normalizeData(JSON.parse(text))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse ${DATA_FILE}: ${error.message}`)
    }
    throw error
  }
}

async function getData(): Promise<TodoDataFile> {
  if (!dataPromise) {
    dataPromise = readFromDisk()
  }
  return dataPromise
}

async function saveData(data: TodoDataFile): Promise<void> {
  if (!isTauri()) {
    memoryData = normalizeData(data)
    dataPromise = Promise.resolve(memoryData)
    await writeDevDataFile(memoryData)
    return
  }

  writeQueue = writeQueue.catch(() => undefined).then(() =>
    writeTextFile(DATA_FILE, JSON.stringify(data, null, 2), { baseDir: BaseDirectory.AppData })
  )
  await writeQueue
}

async function updateData(mutator: (data: TodoDataFile) => void): Promise<void> {
  const data = await getData()
  mutator(data)
  const normalized = normalizeData(data)
  dataPromise = Promise.resolve(normalized)
  await saveData(normalized)
}

export const TAG_COLORS = [
  '#EF4444', '#3B82F6', '#22C55E', '#EAB308',
  '#F97316', '#A855F7', '#EC4899', '#06B6D4',
]

export async function getAllTags(): Promise<Tag[]> {
  const data = await getData()
  return [...data.tags]
}

export async function addTag(tag: Tag): Promise<void> {
  await updateData((data) => {
    data.tags = data.tags.filter((item) => item.id !== tag.id)
    data.tags.push(tag)
  })
}

export async function updateTag(tag: Tag): Promise<void> {
  await addTag(tag)
}

export async function deleteTag(id: string): Promise<void> {
  await updateData((data) => {
    data.tags = data.tags.filter((tag) => tag.id !== id)
    data.todoTags = data.todoTags.filter((link) => link.tagId !== id)
  })
}

export async function getTodoTags(todoId: string): Promise<string[]> {
  const data = await getData()
  return data.todoTags.filter((record) => record.todoId === todoId).map((record) => record.tagId)
}

export async function addTodoTag(todoId: string, tagId: string): Promise<void> {
  await updateData((data) => {
    const exists = data.todoTags.some((record) => record.todoId === todoId && record.tagId === tagId)
    if (!exists) {
      data.todoTags.push({ todoId, tagId })
    }
  })
}

export async function removeTodoTag(todoId: string, tagId: string): Promise<void> {
  await updateData((data) => {
    data.todoTags = data.todoTags.filter((record) => record.todoId !== todoId || record.tagId !== tagId)
  })
}

export async function removeAllTodoTags(todoId: string): Promise<void> {
  await updateData((data) => {
    data.todoTags = data.todoTags.filter((record) => record.todoId !== todoId)
  })
}

export async function getTagsByIds(ids: string[]): Promise<Tag[]> {
  const data = await getData()
  return data.tags.filter((tag) => ids.includes(tag.id))
}

export async function getAllTodos(): Promise<Todo[]> {
  const data = await getData()
  return [...data.todos]
}

export async function addTodo(todo: Todo): Promise<void> {
  await updateData((data) => {
    data.todos = data.todos.filter((item) => item.id !== todo.id)
    data.todos.push(todo)
  })
}

export async function updateTodo(todo: Todo): Promise<void> {
  await addTodo(todo)
}

export async function deleteTodo(id: string): Promise<void> {
  await updateData((data) => {
    data.todos = data.todos.filter((todo) => todo.id !== id)
    data.todoTags = data.todoTags.filter((link) => link.todoId !== id)
  })
}

export async function getUiFilters(): Promise<Record<string, string>> {
  const data = await getData()
  return { ...data.ui.filters }
}

export async function setUiFilters(filters: Record<string, string>): Promise<void> {
  await updateData((data) => {
    data.ui.filters = { ...filters }
  })
}

export async function getTodoStats() {
  const todos = await getAllTodos()
  return calculateTodoStats(todos)
}
