import { Fabric } from '../../../models/Fabric'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:delete', 'inventory:manage'])
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()
  const fabric = await Fabric.findById(id)
  if (!fabric) throw apiError('FABRIC_NOT_FOUND', 404)

  if ((fabric.reservedQty ?? 0) > 0) {
    throw apiError('RESERVED_STOCK', 409, {
      params: { qty: fabric.reservedQty, unit: fabric.unit }
    })
  }

  // Deactivate rather than delete so historical movements keep their reference.
  fabric.isActive = false
  await fabric.save()

  logActivity(event, user, {
    action: 'fabric.deactivate',
    entity: 'Fabric',
    entityId: id,
    summary: `Deactivated fabric ${fabric.name}`
  })

  return { ok: true, deactivated: true }
})
