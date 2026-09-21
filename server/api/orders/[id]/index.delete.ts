import { Order } from '../../../models/Order'
import { Client } from '../../../models/Client'
import { connectToDatabase, withTransaction } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { collectAllocations } from '../../../utils/orders'
import { transitionStockPhase } from '../../../utils/stock'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

/**
 * Only drafts are truly deletable. Anything that has touched stock or taken
 * money must be cancelled instead so the ledger stays auditable.
 */
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders:delete')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()

  const order = await Order.findById(id)
  if (!order) throw apiError('ORDER_NOT_FOUND', 404)

  if (order.payments.length > 0) {
    throw apiError('ORDER_HAS_PAYMENTS', 409)
  }

  await withTransaction(async (session) => {
    if (order.stockPhase !== 'none') {
      await transitionStockPhase(
        collectAllocations(order),
        order.stockPhase as 'reserved' | 'consumed',
        'none',
        {
          session,
          actor: user,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
          reason: `Order ${order.orderNumber} deleted`
        }
      )
    }

    await Client.updateOne(
      { _id: order.client },
      { $inc: { totalOrders: -1, debtBalance: -order.balanceDue } },
      { session }
    )

    await Order.deleteOne({ _id: id }, { session })
  })

  logActivity(event, user, {
    action: 'order.delete',
    entity: 'Order',
    entityId: id,
    summary: `Deleted ${order.orderNumber} (${order.clientName})`
  })

  return { ok: true }
})
