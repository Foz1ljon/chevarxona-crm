import type { H3Event } from 'h3'
import { z, type ZodType } from 'zod'
import mongoose from 'mongoose'
const { Types } = mongoose

/** Reads the JSON body and validates it, surfacing field errors to the UI. */
export async function readValidatedBodyOrThrow<T extends ZodType>(
  event: H3Event,
  schema: T
): Promise<z.infer<T>> {
  const body = await readBody(event).catch(() => ({}))
  return parseOrThrow(schema, body)
}

export function getValidatedQueryOrThrow<T extends ZodType>(event: H3Event, schema: T): z.infer<T> {
  return parseOrThrow(schema, getQuery(event))
}

export function parseOrThrow<T extends ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input)

  if (!result.success) {
    throw apiError('VALIDATION_FAILED', 422, {
      data: {
        // Shape matches what Nuxt UI's <UForm> expects back from the server;
        // `message` is a field-error code the client localizes.
        errors: result.error.issues.map(issue => ({
          name: issue.path.join('.'),
          message: issue.message
        }))
      }
    })
  }

  return result.data
}

/** Reusable zod primitives for Mongo-flavoured payloads. */
export const objectId = z
  .string()
  .refine(value => Types.ObjectId.isValid(value), 'FIELD_INVALID_ID')

export const optionalObjectId = objectId.nullish().or(z.literal('').transform(() => null))

export const dateish = z
  .union([z.string(), z.date(), z.null()])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined || value === '') return null
    const parsed = value instanceof Date ? value : new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  })

export const money = z.coerce.number().min(0).max(1_000_000_000_000)
export const quantity = z.coerce.number().min(0).max(1_000_000)

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(60).optional(),
  dir: z.enum(['asc', 'desc']).default('desc')
})

export function buildSort(sort: string | undefined, dir: 'asc' | 'desc', fallback = 'createdAt') {
  const field = sort && /^[a-zA-Z0-9_.]+$/.test(sort) ? sort : fallback
  return { [field]: dir === 'asc' ? 1 : -1 } as Record<string, 1 | -1>
}

export function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export { z }
