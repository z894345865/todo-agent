import test from 'node:test'
import assert from 'node:assert/strict'
import { todoTools } from '../src/agent/tools.ts'
import { zodToJsonSchema } from '../src/agent/toolSchema.ts'

test('todo_create schema only requires text', () => {
  const schema = zodToJsonSchema(todoTools.todo_create.inputSchema) as any

  assert.deepEqual(schema.required, ['text'])
  assert.equal(schema.properties.text.type, 'string')
  assert.deepEqual(schema.properties.priority.enum, ['high', 'medium', 'low'])
  assert.equal(schema.properties.tags.type, 'array')
  assert.equal(schema.properties.tags.items.type, 'string')
  assert.equal(schema.properties.dueDate.type, 'string')
})

test('todo_list schema keeps optional filters optional and scalar enums scalar', () => {
  const schema = zodToJsonSchema(todoTools.todo_list.inputSchema) as any

  assert.equal(schema.required, undefined)
  assert.deepEqual(schema.properties.status.enum, ['all', 'active', 'completed'])
  assert.deepEqual(schema.properties.priority.enum, ['all', 'high', 'medium', 'low'])
  assert.deepEqual(schema.properties.overdue.enum, ['all', 'yes', 'no'])
  assert.equal(schema.properties.tags.type, 'array')
  assert.equal(schema.properties.dueDateStart.nullable, true)
})
