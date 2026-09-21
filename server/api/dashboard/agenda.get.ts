import { Order } from '../../models/Order'
import { connectToDatabase } from '../../utils/db'
import { getValidatedQueryOrThrow, z } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'
import { scopeFilterForUser } from '../../utils/orders'
import type { AgendaEntry, DashboardAgenda } from '../../../shared/types/dashboard'
import type { OrderStatus } from '../../../shared/utils/orderStatus'

const querySchema = z.object({
  days: z.coerce.number().int().min(1).max(60).default(14)
})

/** Upcoming fittings and deadlines, merged into one chronological agenda. */
export default defineEventHandler(async (event): Promise<DashboardAgenda> => {
  const user = await requirePermission(event, 'dashboard:read')
  const { days } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const until = new Date(today)
  until.setDate(until.getDate() + days)

  const scope = scopeFilterForUser(user)
  const open = { $nin: ['COMPLETED', 'CANCELLED'] as OrderStatus[] }

  const [fittings, deadlines] = await Promise.all([
    Order.find({ ...scope, status: open, fittingDate: { $gte: today, $lte: until } })
      .sort({ fittingDate: 1 })
      .limit(50)
      .select('orderNumber clientName clientPhone fittingDate status priority')
      .lean(),
    Order.find({ ...scope, status: open, deadline: { $gte: today, $lte: until } })
      .sort({ deadline: 1 })
      .limit(50)
      .select('orderNumber clientName clientPhone deadline status priority balanceDue')
      .lean()
  ])

  const entries = [
    ...fittings.map(order => ({ type: 'FITTING', date: order.fittingDate!, order })),
    ...deadlines.map(order => ({ type: 'DEADLINE', date: order.deadline!, order }))
  ].sort((a, b) => Number(new Date(a.date)) - Number(new Date(b.date))) as unknown as AgendaEntry[]

  return { entries, from: today.toISOString(), to: until.toISOString() }
})
