import { GarmentCategory } from '../../../models/GarmentCategory'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import { garmentCategoryBaseSchema } from './index.post'

const patchSchema = garmentCategoryBaseSchema.partial().extend({
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'catalog:manage')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, patchSchema)

  await connectToDatabase()

  if (input.slug) {
    const clash = await GarmentCategory.findOne({ slug: input.slug, _id: { $ne: id } }).lean()
    if (clash) {
      throw apiError('VALIDATION_FAILED', 409, {
        data: { errors: [{ name: 'slug', message: 'FIELD_SLUG_TAKEN' }] }
      })
    }
  }

  const category = await GarmentCategory.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true }).lean()
  if (!category) throw apiError('GARMENT_TYPE_NOT_FOUND', 404)

  logActivity(event, user, {
    action: 'catalog.update',
    entity: 'GarmentCategory',
    entityId: id,
    summary: `Updated garment type ${category.name}`,
    meta: { fields: Object.keys(input) }
  })

  return category
})
