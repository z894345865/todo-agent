import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const dataPath = resolve('.local-data', 'task-data.json')
const data = JSON.parse(await readFile(dataPath, 'utf8'))
const todoTag = data.tags?.find((tag) => tag.name === 'TODO')

if (!todoTag) {
  console.log('No TODO tag found.')
  process.exit(0)
}

const tasks = (data.tasks ?? [])
  .filter((task) => (task.tagIds ?? []).includes(todoTag.id))
  .filter((task) => (task.status ?? (task.completed ? 'done' : 'todo')) !== 'done')
  .sort(compareTasks)

if (tasks.length === 0) {
  console.log('No open TODO-tagged tasks.')
  process.exit(0)
}

for (const task of tasks) {
  const title = task.title ?? task.text ?? '(untitled)'
  const priority = task.priority ?? 'medium'
  const dueDate = task.dueDate ?? 'no due date'
  console.log(`[${priority}] ${title} | due: ${dueDate} | id: ${task.id}`)
  if (task.description) {
    console.log(`  ${firstLine(task.description)}`)
  }
}

function compareTasks(left, right) {
  return priorityRank(left.priority) - priorityRank(right.priority) || String(left.dueDate ?? '').localeCompare(String(right.dueDate ?? '')) || String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? ''))
}

function priorityRank(priority) {
  if (priority === 'urgent') return 0
  if (priority === 'high') return 1
  if (priority === 'medium') return 2
  if (priority === 'low') return 3
  return 4
}

function firstLine(value) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 180)
}
