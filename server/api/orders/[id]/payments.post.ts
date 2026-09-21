import { Order } from '../../../models/Order'
import { Client } from '../../../models/Client'
import { connectToDatabase, withTransaction } from '../../../utils/db'
import { money, objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

const schema = z.object({
  amount: money.refine(value => value > 0, 'FIELD_AMOUNT_POSITIVE'),
  method: z.enum(['CASH', 'CARD', 'TRANSFER', 'OTHER']).default('CASH'),
  note: z.string().trim().max(240).default('')
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders:payment')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const updated = await withTransaction(async (session) => {
    const order = await Order.findById(id).session(session ?? null)
    if (!order) throw apiError('ORDER_NOT_FOUND', 404)

    if (order.status === 'CANCELLED') {
      throw apiError('PAYMENT_ON_CANCELLED', 409)
    }

    if (input.amount > order.balanceDue + 0.5) {
      throw apiError('VALIDATION_FAILED', 422, {
        data: {
          errors: [{
            name: 'amount',
            message: 'FIELD_AMOUNT_EXCEEDS',
            params: { balance: order.balanceDue.toLocaleString() }
          }]
        }
      })
    }

    order.payments.push({
      amount: input.amount,
      method: input.method,
      note: input.note,
      receivedBy: user.id,
      receivedAt: new Date()
    } as never)

    order.recalculateTotals()
    await order.save({ session })

    await Client.updateOne(
      { _id: order.client },
      { $inc: { debtBalance: -input.amount, totalSpent: input.amount } },
      { session }
    )

    return order
  })

  logActivity(event, user, {
    action: 'order.payment',
    entity: 'Order',
    entityId: id,
    summary: `Received ${input.amount.toLocaleString()} on ${updated.orderNumber} (${input.method})`,
    meta: { amount: input.amount, method: input.method, balanceDue: updated.balanceDue }
  })

  return updated.toObject()
})
