import { Accessory } from '../../../models/Accessory'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { assertUniqueSku } from '../../../utils/inventory'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import { accessoryInputSchema } from './index.post'

const patchSchema = accessoryInputSchema.omit({ stockQty: true }).partial().extend({
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:update', 'inventory:manage'])
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, patchSchema)

  await connectToDatabase()
  if (input.sku) await assertUniqueSku(Accessory, input.sku, id)

  const accessory = await Accessory.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true })
  if (!accessory) throw apiError('ACCESSORY_NOT_FOUND', 404)

  logActivity(event, user, {
    action: 'accessory.update',
    entity: 'Accessory',
    entityId: id,
    summary: `Updated accessory ${accessory.name}`,
    meta: { fields: Object.keys(input) }
  })

  return accessory.toObject()
})
