import { Order } from '../../../models/Order'
import { Client } from '../../../models/Client'
import { connectToDatabase, withTransaction } from '../../../utils/db'
import { dateish, money, objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { collectAllocations, orderItemInputSchema, resolveOrderItems } from '../../../utils/orders'
import { transitionStockPhase } from '../../../utils/stock'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

const schema = z.object({
  fittingDate: dateish,
  deadline: dateish,
  discount: money.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  notes: z.string().trim().max(2000).optional(),
  /** Replacing items re-runs the whole reservation for this order. */
  items: z.array(orderItemInputSchema).min(1).max(30).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders:update')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const existing = await Order.findById(id)
  if (!existing) throw apiError('ORDER_NOT_FOUND', 404)

  if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
    throw apiError('ORDER_LOCKED', 409, { params: { status: existing.status } })
  }

  const resolvedItems = input.items ? await resolveOrderItems(input.items) : null

  const updated = await withTransaction(async (session) => {
    const order = await Order.findById(id).session(session ?? null)
    if (!order) throw apiError('ORDER_NOT_FOUND', 404)

    const debtBefore = order.balanceDue

    if (resolvedItems) {
      const previousPhase = order.stockPhase as 'none' | 'reserved' | 'consumed'

      // Release the old reservation before applying the new one, otherwise a
      // shrunk order would leave material stranded.
      if (previousPhase !== 'none') {
        await transitionStockPhase(collectAllocations(order), previousPhase, 'none', {
          session,
          actor: user,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          reason: `Order ${order.orderNumber} items edited`
        })
      }

      order.items = resolvedItems as never
      order.stockPhase = 'none'

      if (previousPhase !== 'none') {
        await transitionStockPhase(collectAllocations(order), 'none', previousPhase, {
          session,
          actor: user,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          reason: `Order ${order.orderNumber} re-allocated after edit`
        })
        order.stockPhase = previousPhase
      }
    }

    if (input.fittingDate !== undefined) order.fittingDate = input.fittingDate
    if (input.deadline !== undefined) order.deadline = input.deadline
    if (input.discount !== undefined) order.discount = input.discount
    if (input.priority !== undefined) order.priority = input.priority
    if (input.notes !== undefined) order.notes = input.notes

    order.recalculateTotals()
    await order.save({ session })

    const debtDelta = order.balanceDue - debtBefore
    if (debtDelta !== 0) {
      await Client.updateOne({ _id: order.client }, { $inc: { debtBalance: debtDelta } }, { session })
    }

    return order
  })

  logActivity(event, user, {
    action: 'order.update',
    entity: 'Order',
    entityId: id,
    summary: `Updated ${updated.orderNumber}`,
    meta: { fields: Object.keys(input) }
  })

  return updated.toObject()
})
