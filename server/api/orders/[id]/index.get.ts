import { Order } from '../../../models/Order'
import { StockMovement } from '../../../models/StockMovement'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requireAuth, hasPermission } from '../../../utils/auth'
import { assertOrderVisible } from '../../../utils/orders'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!hasPermission(user, ['orders:read', 'orders:read_assigned'])) {
    throw apiError('PERMISSION_DENIED', 403, { params: { permission: 'orders:read' } })
  }

  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  await connectToDatabase()

  const order = await Order.findById(id)
    .populate('client', 'fullName phone secondaryPhone telegramId address debtBalance totalOrders')
    .lean()

  if (!order) throw apiError('ORDER_NOT_FOUND', 404)
  assertOrderVisible(order, user)

  const movements = hasPermission(user, 'inventory:read')
    ? await StockMovement.find({ order: id }).sort({ createdAt: -1 }).lean()
    : []

  return { order, movements }
})
