import test from 'node:test'
import assert from 'node:assert/strict'
import { createClientId } from '../src/utils/id.ts'

test('createClientId uses crypto.randomUUID when available', () => {
  assert.equal(createClientId({ randomUUID: () => 'known-id' }), 'known-id')
})

test('createClientId falls back to getRandomValues when randomUUID is unavailable', () => {
  const id = createClientId({
    getRandomValues: (array) => {
      array.set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
      return array
    },
  })

  assert.equal(id, '00010203-0405-4607-8809-0a0b0c0d0e0f')
})
