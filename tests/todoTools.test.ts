import test from 'node:test'
import assert from 'node:assert/strict'
import { todoTools } from '../src/agent/tools.ts'
import { useTodoStore } from '../src/store/index.ts'

async function resetStore() {
  const store = useTodoStore.getState()
  const todos = await store.init().then(() => useTodoStore.getState().todos)
  for (const todo of todos) {
    await store.delete(todo.id)
  }
}

test('todo_list filters active and completed todos by status', async () => {
  const store = useTodoStore.getState()
  await resetStore()

  const active = await store.add('Active tool test')
  const completed = await store.add('Completed tool test')
  await store.complete(completed.id)

  const activeList = await todoTools.todo_list.execute({ status: 'active' })
  const completedList = await todoTools.todo_list.execute({ status: 'completed' })

  assert.match(activeList, new RegExp(active.id))
  assert.doesNotMatch(activeList, new RegExp(completed.id))
  assert.match(completedList, new RegExp(completed.id))
  assert.doesNotMatch(completedList, new RegExp(active.id))
})

test('todo_list filters todos by priority', async () => {
  const store = useTodoStore.getState()
  await resetStore()

  const high = await store.add('High priority tool test', { priority: 'high' })
  const low = await store.add('Low priority tool test', { priority: 'low' })

  const highList = await todoTools.todo_list.execute({ priority: 'high' })

  assert.match(highList, new RegExp(high.id))
  assert.doesNotMatch(highList, new RegExp(low.id))
  assert.match(highList, /优先级: high/)
})

test('todo_list filters todos by tag', async () => {
  const store = useTodoStore.getState()
  await resetStore()

  const tag = await store.addTag('work', '#3B82F6')
  const tagged = await store.add('Tagged tool test')
  const untagged = await store.add('Untagged tool test')
  await store.addTagToTodo(tagged.id, tag.id)

  const taggedList = await todoTools.todo_list.execute({ tags: ['work'] })

  assert.match(taggedList, new RegExp(tagged.id))
  assert.doesNotMatch(taggedList, new RegExp(untagged.id))
  assert.match(taggedList, /标签: work/)
})

test('todo_list filters overdue todos', async () => {
  const store = useTodoStore.getState()
  await resetStore()

  const overdue = await store.add('Overdue tool test', { dueDate: Date.now() - 86400000 })
  const future = await store.add('Future tool test', { dueDate: Date.now() + 86400000 })

  const overdueList = await todoTools.todo_list.execute({ overdue: 'yes' })

  assert.match(overdueList, new RegExp(overdue.id))
  assert.doesNotMatch(overdueList, new RegExp(future.id))
})
