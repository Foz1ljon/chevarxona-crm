import { Order } from '../../../models/Order'
import { Client } from '../../../models/Client'
import { connectToDatabase, withTransaction } from '../../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { collectAllocations, assertOrderVisible } from '../../../utils/orders'
import { transitionStockPhase } from '../../../utils/stock'
import { requirePermission, hasPermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import {
  ORDER_STATUSES,
  ORDER_STATUS_META,
  canTransition,
  stockPhase,
  type OrderStatus
} from '../../../../shared/utils/orderStatus'

const schema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).default(''),
  /** Bypasses the transition map — reserved for SUPER_ADMIN corrections. */
  force: z.boolean().default(false)
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'orders:status_change')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const { status: target, note, force } = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const current = await Order.findById(id).lean()
  if (!current) throw apiError('ORDER_NOT_FOUND', 404)
  assertOrderVisible(current, user)

  const from = current.status as OrderStatus
  if (from === target) return { ok: true, unchanged: true, status: from }

  const mayForce = force && user.roleKey === 'SUPER_ADMIN'
  if (!mayForce && !canTransition(from, target)) {
    const allowed = ORDER_STATUSES.filter(status => canTransition(from, status))

    throw apiError(allowed.length ? 'ORDER_TRANSITION' : 'ORDER_TRANSITION_TERMINAL', 409, {
      params: { from, to: target, allowed }
    })
  }

  // Tailors may progress work but must not close the financial side of an order.
  if (!hasPermission(user, 'orders:read') && (target === 'COMPLETED' || target === 'CANCELLED')) {
    throw apiError('MANAGER_ONLY_CLOSE', 403)
  }

  const fromPhase = current.stockPhase as 'none' | 'reserved' | 'consumed'
  const toPhase = stockPhase(target)

  const updated = await withTransaction(async (session) => {
    const order = await Order.findById(id).session(session ?? null)
    if (!order) throw apiError('ORDER_NOT_FOUND', 404)

    // Re-check under the transaction: another request may have moved it already.
    if ((order.status as OrderStatus) !== from) {
      throw apiError('ORDER_RACE', 409, { params: { status: order.status } })
    }

    if (fromPhase !== toPhase) {
      await transitionStockPhase(collectAllocations(order), fromPhase, toPhase, {
        session,
        actor: user,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        reason: `${ORDER_STATUS_META[from].label} → ${ORDER_STATUS_META[target].label}`
      })
      order.stockPhase = toPhase
    }

    order.status = target
    order.statusHistory.push({
      from, to: target, note, by: user.id, byName: user.fullName, at: new Date()
    } as never)

    if (target === 'COMPLETED') {
      order.completedAt = new Date()
      for (const item of order.items) {
        item.status = 'COMPLETED'
        item.completedAt ??= new Date()
      }
    }

    if (target === 'IN_CUTTING') {
      for (const item of order.items) {
        if (item.status === 'PENDING') item.status = 'CUTTING'
      }
    }

    if (target === 'IN_TAILORING') {
      for (const item of order.items) {
        if (item.status === 'PENDING' || item.status === 'CUTTING') {
          item.status = 'IN_PROGRESS'
          item.startedAt ??= new Date()
        }
      }
    }

    if (target === 'CANCELLED') {
      order.cancelledAt = new Date()
      order.cancelReason = note
      // A cancelled order stops being a receivable.
      await Client.updateOne({ _id: order.client }, { $inc: { debtBalance: -order.balanceDue } }, { session })
    }

    if (from === 'CANCELLED' && target !== 'CANCELLED') {
      await Client.updateOne({ _id: order.client }, { $inc: { debtBalance: order.balanceDue } }, { session })
      order.cancelledAt = null
      order.cancelReason = ''
    }

    if (target === 'COMPLETED') {
      await Client.updateOne({ _id: order.client }, { $inc: { totalSpent: order.advancePayment } }, { session })
    }

    await order.save({ session })
    return order
  })

  logActivity(event, user, {
    action: 'order.status_change',
    entity: 'Order',
    entityId: id,
    summary: `${updated.orderNumber}: ${ORDER_STATUS_META[from].label} → ${ORDER_STATUS_META[target].label}`,
    meta: { from, to: target, note, stockPhase: toPhase, forced: mayForce }
  })

  return updated.toObject()
})
