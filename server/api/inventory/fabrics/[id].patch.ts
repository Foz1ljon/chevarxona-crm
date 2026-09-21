import { Fabric } from '../../../models/Fabric'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { assertUniqueSku } from '../../../utils/inventory'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import { fabricInputSchema } from './index.post'

// `stockQty` is deliberately excluded — quantity only moves through /adjust so
// every change leaves a ledger entry.
const patchSchema = fabricInputSchema.omit({ stockQty: true }).partial().extend({
  isActive: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:update', 'inventory:manage'])
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, patchSchema)

  await connectToDatabase()
  if (input.sku) await assertUniqueSku(Fabric, input.sku, id)

  const fabric = await Fabric.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true })
  if (!fabric) throw apiError('FABRIC_NOT_FOUND', 404)

  logActivity(event, user, {
    action: 'fabric.update',
    entity: 'Fabric',
    entityId: id,
    summary: `Updated fabric ${fabric.name}`,
    meta: { fields: Object.keys(input) }
  })

  return fabric.toObject()
})
