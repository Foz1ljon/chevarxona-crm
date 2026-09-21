import { Order } from '../../models/Order'
import { Client } from '../../models/Client'
import { nextOrderNumber } from '../../models/Counter'
import { connectToDatabase, withTransaction } from '../../utils/db'
import { dateish, money, objectId, readValidatedBodyOrThrow, z } from '../../utils/validation'
import { collectAllocations, orderItemInputSchema, resolveOrderItems } from '../../utils/orders'
import { findShortages, transitionStockPhase } from '../../utils/stock'
import { stockPhase, type OrderStatus } from '../../../shared/utils/orderStatus'
import { requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

const schema = z.object({
  client: objectId,
  status: z.enum(['DRAFT', 'PENDING_DEPOSIT', 'MATERIAL_ALLOCATED']).default('DRAFT'),
  orderDate: dateish,
  fittingDate: dateish,
  deadline: dateish,
  items: z.array(orderItemInputSchema).min(1, 'FIELD_GARMENTS_REQUIRED').max(30),
  discount: money.default(0),
  advancePayment: money.default(0),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  notes: z.string().trim().max(2000).default('')
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders:create')
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const client = await Client.findById(input.client).select('fullName phone').lean()
  if (!client) throw apiError('CLIENT_NOT_FOUND', 422)

  const items = await resolveOrderItems(input.items)

  // Fail before writing anything when the order cannot actually be covered.
  const targetPhase = stockPhase(input.status as OrderStatus)
  if (targetPhase !== 'none') {
    const shortages = await findShortages(collectAllocations({ items }))
    if (shortages.length) {
      throw apiError('INSUFFICIENT_STOCK', 409, { data: { shortages } })
    }
  }

  const order = await withTransaction(async (session) => {
    const orderNumber = await nextOrderNumber(session)

    const [created] = await Order.create(
      [{
        orderNumber,
        client: client._id,
        clientName: client.fullName,
        clientPhone: client.phone,
        status: input.status,
        orderDate: input.orderDate ?? new Date(),
        fittingDate: input.fittingDate,
        deadline: input.deadline,
        items,
        discount: input.discount,
        priority: input.priority,
        notes: input.notes,
        stockPhase: 'none',
        payments: input.advancePayment > 0
          ? [{ amount: input.advancePayment, method: 'CASH', note: 'Advance payment', receivedBy: user.id }]
          : [],
        statusHistory: [{ from: null, to: input.status, by: user.id, byName: user.fullName, at: new Date() }],
        createdBy: user.id
      }],
      { session, ordered: true }
    )

    if (!created) throw apiError('ORDER_CREATE_FAILED', 500)

    created.recalculateTotals()

    if (targetPhase !== 'none') {
      await transitionStockPhase(collectAllocations(created as never), 'none', targetPhase, {
        session,
        actor: user,
        orderId: String(created._id),
        orderNumber,
        reason: `Order ${orderNumber} created as ${input.status}`
      })
      created.stockPhase = targetPhase
    }

    await created.save({ session })

    await Client.updateOne(
      { _id: client._id },
      {
        $inc: { totalOrders: 1, debtBalance: created.balanceDue },
        $set: { lastOrderAt: created.orderDate }
      },
      { session }
    )

    return created
  })

  logActivity(event, user, {
    action: 'order.create',
    entity: 'Order',
    entityId: String(order._id),
    summary: `Created ${order.orderNumber} for ${client.fullName} (${order.items.length} garments)`,
    meta: { total: order.totalPrice, status: order.status }
  })

  return order.toObject()
})
