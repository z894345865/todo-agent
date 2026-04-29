import { getAuthHeaders } from '../auth/client.ts'
import { normalizeData, type TodoDataFile } from './localJsonStore.ts'

const DEV_DATA_ENDPOINT = '/__todo_data'

export async function readDevDataFile(): Promise<TodoDataFile | null> {
  try {
    const response = await fetch(DEV_DATA_ENDPOINT, { headers: { Accept: 'application/json', ...getAuthHeaders() } })
    if (!response.ok) return null
    return normalizeData(await response.json())
  } catch {
    return null
  }
}

export async function writeDevDataFile(data: TodoDataFile): Promise<boolean> {
  try {
    const response = await fetch(DEV_DATA_ENDPOINT, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(data),
    })
    return response.ok
  } catch {
    return false
  }
}
