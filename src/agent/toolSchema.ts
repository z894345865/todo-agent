import { z } from 'zod'

export function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = schemaToJson(schema)
  return isRecord(jsonSchema) ? jsonSchema : {}
}

function schemaToJson(schema: z.ZodType): unknown {
  const def = (schema as any)._def
  if (!def) return {}

  if (def.type === 'object') {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    const shape = typeof def.shape === 'function' ? def.shape() : def.shape

    for (const [key, value] of Object.entries(shape ?? {})) {
      const field = value as z.ZodType
      properties[key] = schemaToJson(unwrapOptional(field).schema)
      if (!unwrapOptional(field).optional) {
        required.push(key)
      }
    }

    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
    }
  }

  if (def.type === 'optional') {
    return schemaToJson(def.innerType)
  }

  if (def.type === 'nullable') {
    const inner = schemaToJson(def.innerType)
    return isRecord(inner) ? { ...inner, nullable: true } : { nullable: true }
  }

  if (def.type === 'string') return { type: 'string' }
  if (def.type === 'number') return { type: 'number' }
  if (def.type === 'boolean') return { type: 'boolean' }

  if (def.type === 'enum') {
    return { type: 'string', enum: Object.values(def.entries ?? {}) }
  }

  if (def.type === 'array') {
    return { type: 'array', items: schemaToJson(def.element) }
  }

  return {}
}

function unwrapOptional(schema: z.ZodType): { schema: z.ZodType; optional: boolean } {
  const def = (schema as any)._def
  if (def?.type === 'optional') {
    return { schema: def.innerType, optional: true }
  }
  return { schema, optional: false }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
