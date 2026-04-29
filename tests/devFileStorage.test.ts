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
  const originalSessionStorage = globalThis.sessionStorage
  const storage = new Map<string, string>()
  const data = createEmptyData()
  data.todos.push({ id: '1', text: 'Write me', completed: false, createdAt: 1 })

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => {
        storage.delete(key)
      },
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
    },
  })

  let body = ''
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/__todo_data')
    assert.equal(init?.method, 'PUT')
    assert.equal((init?.headers as Record<string, string>)?.Authorization, 'Bearer test-token')
    body = String(init?.body)
    return new Response(null, { status: 204 })
  }

  try {
    sessionStorage.setItem('todo-auth-token', 'test-token')
    const wrote = await writeDevDataFile(data)

    assert.equal(wrote, true)
    assert.equal(JSON.parse(body).todos[0].text, 'Write me')
  } finally {
    sessionStorage.removeItem('todo-auth-token')
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: originalSessionStorage,
    })
    globalThis.fetch = originalFetch
  }
})
