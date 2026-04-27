import test from 'node:test'
import assert from 'node:assert/strict'
import { createEmptyData } from '../src/db/localJsonStore.ts'
import { readDevDataFile, writeDevDataFile } from '../src/db/devFileStorage.ts'

test('readDevDataFile returns normalized data from the dev server endpoint', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    assert.equal(input, '/__todo_data')
    return new Response(JSON.stringify({
      todos: [{ id: '1', text: 'Persisted', completed: false, createdAt: 1 }],
    }))
  }

  try {
    const data = await readDevDataFile()

    assert.equal(data?.todos[0]?.text, 'Persisted')
    assert.deepEqual(data?.tags, [])
    assert.deepEqual(data?.todoTags, [])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('writeDevDataFile persists data to the dev server endpoint', async () => {
  const originalFetch = globalThis.fetch
  const data = createEmptyData()
  data.todos.push({ id: '1', text: 'Write me', completed: false, createdAt: 1 })

  let body = ''
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/__todo_data')
    assert.equal(init?.method, 'PUT')
    body = String(init?.body)
    return new Response(null, { status: 204 })
  }

  try {
    const wrote = await writeDevDataFile(data)

    assert.equal(wrote, true)
    assert.equal(JSON.parse(body).todos[0].text, 'Write me')
  } finally {
    globalThis.fetch = originalFetch
  }
})
