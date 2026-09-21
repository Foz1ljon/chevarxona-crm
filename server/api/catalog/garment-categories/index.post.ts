import { GarmentCategory } from '../../../models/GarmentCategory'
import { connectToDatabase } from '../../../utils/db'
import { money, objectId, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

const measurementFieldSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]+$/, 'FIELD_KEY_PATTERN').max(40),
  label: z.string().trim().min(1).max(60),
  unit: z.string().trim().max(8).default('cm'),
  required: z.boolean().default(false),
  min: z.coerce.number().min(0).default(0),
  max: z.coerce.number().min(1).default(400),
  hint: z.string().trim().max(160).default(''),
  order: z.coerce.number().int().min(0).default(0)
})

const bomLineSchema = z.object({
  materialType: z.enum(['FABRIC', 'ACCESSORY']),
  material: objectId,
  materialModel: z.enum(['Fabric', 'Accessory']),
  accessoryCategory: z.string().trim().max(40).default(''),
  label: z.string().trim().min(1).max(80),
  quantity: z.coerce.number().min(0).max(10_000),
  unit: z.string().trim().max(10).default('m'),
  wastagePercent: z.coerce.number().min(0).max(100).default(0),
  optional: z.boolean().default(false)
})

export const garmentCategoryBaseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'FIELD_SLUG_PATTERN').max(60),
  description: z.string().trim().max(500).default(''),
  icon: z.string().trim().max(60).default('i-lucide-shirt'),
  basePrice: money.default(0),
  estimatedDays: z.coerce.number().int().min(0).max(365).default(7),
  sortOrder: z.coerce.number().int().min(0).default(0),
  measurementFields: z.array(measurementFieldSchema).max(40).default([]),
  bomTemplate: z.array(bomLineSchema).max(40).default([])
})

/** Zod 4 forbids `.partial()` on a refined object, so the PATCH route reuses
 *  `garmentCategoryBaseSchema` and this refined variant stays POST-only. */
export const garmentCategoryInputSchema = garmentCategoryBaseSchema.refine(
  data => new Set(data.measurementFields.map(f => f.key)).size === data.measurementFields.length,
  { message: 'FIELD_MEASUREMENT_KEYS_UNIQUE', path: ['measurementFields'] }
)

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'catalog:manage')
  const input = await readValidatedBodyOrThrow(event, garmentCategoryInputSchema)

  await connectToDatabase()

  if (await GarmentCategory.findOne({ slug: input.slug }).lean()) {
    throw apiError('VALIDATION_FAILED', 409, {
      data: { errors: [{ name: 'slug', message: 'FIELD_SLUG_TAKEN' }] }
    })
  }

  const category = await GarmentCategory.create(input)

  logActivity(event, user, {
    action: 'catalog.create',
    entity: 'GarmentCategory',
    entityId: String(category._id),
    summary: `Created garment type ${category.name}`
  })

  return category.toObject()
})
