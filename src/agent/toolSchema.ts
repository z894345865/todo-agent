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

  if (def.type === 'string') return stringToJsonSchema(def)
  if (def.type === 'number') return numberToJsonSchema(def)
  if (def.type === 'boolean') return { type: 'boolean' }

  if (def.type === 'enum') {
    return { type: 'string', enum: Object.values(def.entries ?? {}) }
  }

  if (def.type === 'array') {
    return { type: 'array', items: schemaToJson(def.element) }
  }

  return {}
}

function stringToJsonSchema(def: any): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: 'string' }

  for (const check of def.checks ?? []) {
    const checkDef = getCheckDef(check)
    if (checkDef?.check === 'string_format' && checkDef.format === 'regex' && checkDef.pattern instanceof RegExp) {
      schema.pattern = checkDef.pattern.source
    }
  }

  return schema
}

function numberToJsonSchema(def: any): Record<string, unknown> {
  const schema: Record<string, unknown> = { type: 'number' }

  for (const check of def.checks ?? []) {
    const checkDef = getCheckDef(check)
    if (!checkDef) continue

    if (checkDef.check === 'number_format' && (checkDef.format === 'safeint' || checkDef.format === 'int32' || checkDef.format === 'uint32')) {
      schema.type = 'integer'
      continue
    }

    if (checkDef.check === 'greater_than' && typeof checkDef.value === 'number') {
      if (checkDef.inclusive) {
        schema.minimum = checkDef.value
        delete schema.exclusiveMinimum
      } else {
        schema.exclusiveMinimum = checkDef.value
        delete schema.minimum
      }
      continue
    }

    if (checkDef.check === 'less_than' && typeof checkDef.value === 'number') {
      if (checkDef.inclusive) {
        schema.maximum = checkDef.value
        delete schema.exclusiveMaximum
      } else {
        schema.exclusiveMaximum = checkDef.value
        delete schema.maximum
      }
      continue
    }

    if (checkDef.check === 'multiple_of' && typeof checkDef.value === 'number') {
      schema.multipleOf = checkDef.value
    }
  }

  return schema
}

function getCheckDef(check: any): any {
  return check?._zod?.def ?? check?.def
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
