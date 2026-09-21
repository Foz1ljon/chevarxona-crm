import { Accessory } from '../../../models/Accessory'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:delete', 'inventory:manage'])
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()
  const accessory = await Accessory.findById(id)
  if (!accessory) throw apiError('ACCESSORY_NOT_FOUND', 404)

  if ((accessory.reservedQty ?? 0) > 0) {
    throw apiError('RESERVED_STOCK', 409, {
      params: { qty: accessory.reservedQty, unit: accessory.unit }
    })
  }

  accessory.isActive = false
  await accessory.save()

  logActivity(event, user, {
    action: 'accessory.deactivate',
    entity: 'Accessory',
    entityId: id,
    summary: `Deactivated accessory ${accessory.name}`
  })

  return { ok: true, deactivated: true }
})
