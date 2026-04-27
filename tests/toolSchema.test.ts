import test from 'node:test'
import assert from 'node:assert/strict'
import { todoTools } from '../src/agent/tools.ts'
import { zodToJsonSchema } from '../src/agent/toolSchema.ts'

test('create_task schema requires title and keeps task fields optional', () => {
  const schema = zodToJsonSchema(todoTools.create_task.inputSchema) as any

  assert.deepEqual(schema.required, ['title'])
  assert.equal(schema.properties.title.type, 'string')
  assert.equal(schema.properties.text, undefined)
  assert.deepEqual(schema.properties.status.enum, ['todo', 'doing', 'done', 'blocked'])
  assert.deepEqual(schema.properties.priority.enum, ['urgent', 'high', 'medium', 'low'])
  assert.equal(schema.properties.tags.type, 'array')
  assert.equal(schema.properties.tags.items.type, 'string')
  assert.equal(schema.properties.dueDate.type, 'string')
  assert.equal(schema.properties.description.type, 'string')
})

test('list_tasks schema keeps optional filters optional and exposes status and limit', () => {
  const schema = zodToJsonSchema(todoTools.list_tasks.inputSchema) as any

  assert.equal(schema.required, undefined)
  assert.deepEqual(schema.properties.status.enum, ['all', 'todo', 'doing', 'done', 'blocked'])
  assert.deepEqual(schema.properties.priority.enum, ['all', 'urgent', 'high', 'medium', 'low'])
  assert.equal(schema.properties.limit.type, 'number')
  assert.equal(schema.properties.tags.type, 'array')
  assert.equal(schema.properties.tags.items.type, 'string')
  assert.equal(schema.properties.dueDate.nullable, true)
})

test('update_task schema supports nullable due date and description with valid enums', () => {
  const schema = zodToJsonSchema(todoTools.update_task.inputSchema) as any

  assert.deepEqual(schema.required, ['id'])
  assert.deepEqual(schema.properties.status.enum, ['todo', 'doing', 'done', 'blocked'])
  assert.deepEqual(schema.properties.priority.enum, ['urgent', 'high', 'medium', 'low'])
  assert.equal(schema.properties.dueDate.nullable, true)
  assert.equal(schema.properties.description.nullable, true)
})
