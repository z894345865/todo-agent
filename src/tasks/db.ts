import { isTauri } from '@tauri-apps/api/core'
import { BaseDirectory, exists, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import { normalizeTask } from './model.ts'
import type { Tag, Task, TaskAppData, ViewDefinition } from './types.ts'
import { createEmptyTaskData, normalizeTaskData } from './localJsonStore.ts'

const DATA_FILE = 'task-data.json'
const DEV_DATA_ENDPOINT = '/__task_data'

let dataPromise: Promise<TaskAppData> | null = null
let memoryData: TaskAppData = createEmptyTaskData()
let writeQueue = Promise.resolve()

async function readDevTaskDataFile(): Promise<TaskAppData | null> {
  try {
    const response = await fetch(DEV_DATA_ENDPOINT, { headers: { Accept: 'application/json' } })
    if (!response.ok) return null
    return normalizeTaskData(await response.json())
  } catch {
    return null
  }
}

async function writeDevTaskDataFile(data: TaskAppData): Promise<boolean> {
  try {
    const response = await fetch(DEV_DATA_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.ok
  } catch {
    return false
  }
}

async function readFromDisk(): Promise<TaskAppData> {
  if (!isTauri()) {
    return (await readDevTaskDataFile()) ?? memoryData
  }

  const fileExists = await exists(DATA_FILE, { baseDir: BaseDirectory.AppData })
  if (!fileExists) {
    const empty = createEmptyTaskData()
    await writeTextFile(DATA_FILE, JSON.stringify(empty, null, 2), { baseDir: BaseDirectory.AppData })
    return empty
  }

  const text = await readTextFile(DATA_FILE, { baseDir: BaseDirectory.AppData })
  try {
    return normalizeTaskData(JSON.parse(text))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse ${DATA_FILE}: ${error.message}`)
    }
    throw error
  }
}

async function saveData(data: TaskAppData): Promise<void> {
  const normalized = normalizeTaskData(data)

  memoryData = normalized
  dataPromise = Promise.resolve(memoryData)

  if (!isTauri()) {
    await writeDevTaskDataFile(normalized)
    return
  }

  writeQueue = writeQueue.catch(() => undefined).then(() =>
    writeTextFile(DATA_FILE, JSON.stringify(normalized, null, 2), { baseDir: BaseDirectory.AppData })
  )
  await writeQueue
}

async function updateData(mutator: (data: TaskAppData) => void): Promise<void> {
  const data = await getTaskData()
  mutator(data)
  await saveData(data)
}

export async function getTaskData(): Promise<TaskAppData> {
  if (!dataPromise) {
    dataPromise = readFromDisk()
  }
  return normalizeTaskData(await dataPromise)
}

export async function getAllTaskRecords(): Promise<Task[]> {
  const data = await getTaskData()
  return data.tasks.map((task) => normalizeTask(task))
}

export async function addTaskRecord(task: Task): Promise<void> {
  const normalizedTask = normalizeTask(task)
  await updateData((data) => {
    data.tasks = data.tasks.filter((item) => item.id !== normalizedTask.id)
    data.tasks.push(normalizedTask)
  })
}

export async function updateTaskRecord(task: Task): Promise<void> {
  await addTaskRecord(task)
}

export async function deleteTaskRecord(id: string): Promise<void> {
  await updateData((data) => {
    data.tasks = data.tasks.filter((task) => task.id !== id)
    if (data.ui.selectedTaskId === id) {
      delete data.ui.selectedTaskId
    }
  })
}

export async function addTagRecord(tag: Tag): Promise<void> {
  await updateData((data) => {
    data.tags = data.tags.filter((item) => item.id !== tag.id)
    data.tags.push(tag)
  })
}

export async function updateViewRecord(view: ViewDefinition): Promise<void> {
  await updateData((data) => {
    data.views = data.views.filter((item) => item.id !== view.id)
    data.views.push(view)
  })
}

export async function setActiveViewId(viewId: string): Promise<void> {
  await updateData((data) => {
    data.ui.activeViewId = viewId
  })
}

export async function setSelectedTaskId(taskId: string | undefined): Promise<void> {
  await updateData((data) => {
    if (taskId) {
      data.ui.selectedTaskId = taskId
    } else {
      delete data.ui.selectedTaskId
    }
  })
}

export async function __resetTaskDataForTests(data: TaskAppData | null = createEmptyTaskData()): Promise<void> {
  if (data === null) {
    memoryData = createEmptyTaskData()
    dataPromise = null
    writeQueue = Promise.resolve()
    return
  }

  memoryData = normalizeTaskData(data)
  dataPromise = Promise.resolve(memoryData)
  writeQueue = Promise.resolve()
}
