import { Order } from '../../../../models/Order'
import { User } from '../../../../models/User'
import { connectToDatabase } from '../../../../utils/db'
import { objectId, optionalObjectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../../utils/validation'
import { requireAuth, hasPermission } from '../../../../utils/auth'
import { logActivity } from '../../../../utils/activity'
import { ITEM_STATUSES } from '../../../../../shared/utils/orderStatus'

const schema = z.object({
  status: z.enum(ITEM_STATUSES).optional(),
  assignedTailor: optionalObjectId,
  notes: z.string().trim().max(1000).optional(),
  /** Tailors log what they actually used; the difference settles on consumption. */
  consumed: z.array(z.object({
    material: objectId,
    consumedQty: z.coerce.number().min(0).max(100_000)
  })).max(40).optional()
})

/**
 * Per-garment updates. A tailor may only touch a garment assigned to them and
 * may only change its status / consumption — reassignment needs `orders:assign`.
 */
export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const itemId = parseOrThrow(objectId, getRouterParam(event, 'itemId'))
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const order = await Order.findById(id)
  if (!order) throw apiError('ORDER_NOT_FOUND', 404)

  const item = order.items.id(itemId)
  if (!item) throw apiError('GARMENT_NOT_FOUND', 404)

  const isOwnGarment = String(item.assignedTailor ?? '') === user.id
  const canManage = hasPermission(user, ['orders:update', 'orders:assign'])

  if (!canManage && !isOwnGarment) {
    throw apiError('GARMENT_NOT_ASSIGNED', 403)
  }

  if (input.status !== undefined) {
    if (!hasPermission(user, ['orders:status_change', 'orders:update'])) {
      throw apiError('PERMISSION_DENIED', 403, { params: { permission: 'orders:status_change' } })
    }
    item.status = input.status
    if (input.status === 'IN_PROGRESS') item.startedAt ??= new Date()
    if (input.status === 'COMPLETED') item.completedAt = new Date()
  }

  if (input.assignedTailor !== undefined) {
    if (!hasPermission(user, 'orders:assign')) {
      throw apiError('PERMISSION_DENIED', 403, { params: { permission: 'orders:assign' } })
    }

    if (input.assignedTailor) {
      const tailor = await User.findById(input.assignedTailor).select('fullName isActive').lean()
      if (!tailor) throw apiError('TAILOR_NOT_FOUND', 422)
      if (!tailor.isActive) throw apiError('TAILOR_DEACTIVATED', 422, { params: { name: tailor.fullName } })
      item.assignedTailor = input.assignedTailor as never
      item.assignedTailorName = tailor.fullName
    } else {
      item.assignedTailor = null
      item.assignedTailorName = ''
    }
  }

  if (input.notes !== undefined) item.notes = input.notes

  if (input.consumed?.length) {
    const byMaterial = new Map(input.consumed.map(entry => [entry.material, entry.consumedQty]))
    for (const allocation of item.allocations) {
      const logged = byMaterial.get(String(allocation.material))
      if (logged !== undefined) allocation.consumedQty = logged
    }
  }

  await order.save()

  logActivity(event, user, {
    action: 'order.item_update',
    entity: 'Order',
    entityId: id,
    summary: `${order.orderNumber} · ${item.garmentName}: ${
      input.status ? `status → ${input.status}` : 'details updated'
    }`,
    meta: { itemId, ...input }
  })

  return order.toObject()
})
