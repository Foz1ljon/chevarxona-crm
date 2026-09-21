import { Order } from '../../models/Order'
import { connectToDatabase } from '../../utils/db'
import { buildSort, escapeRegex, getValidatedQueryOrThrow, objectId, paginationSchema, z } from '../../utils/validation'
import { requireAuth, hasPermission } from '../../utils/auth'
import { scopeFilterForUser } from '../../utils/orders'
import { ORDER_STATUSES } from '../../../shared/utils/orderStatus'

const querySchema = paginationSchema.extend({
  status: z.string().trim().max(200).optional(),
  client: objectId.optional(),
  tailor: objectId.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  overdue: z.enum(['true', 'false']).optional(),
  unpaid: z.enum(['true', 'false']).optional(),
  from: z.string().optional(),
  to: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!hasPermission(user, ['orders:read', 'orders:read_assigned'])) {
    throw apiError('PERMISSION_DENIED', 403, { params: { permission: 'orders:read' } })
  }

  const query = getValidatedQueryOrThrow(event, querySchema)
  await connectToDatabase()

  const filter: Record<string, unknown> = { ...scopeFilterForUser(user) }

  if (query.status) {
    const statuses = query.status.split(',').map(s => s.trim()).filter(s => ORDER_STATUSES.includes(s as never))
    if (statuses.length) filter.status = { $in: statuses }
  }
  if (query.client) filter.client = query.client
  if (query.tailor) filter['items.assignedTailor'] = query.tailor
  if (query.priority) filter.priority = query.priority
  if (query.unpaid === 'true') filter.balanceDue = { $gt: 0 }
  if (query.overdue === 'true') {
    filter.deadline = { $lt: new Date() }
    filter.status = { $nin: ['COMPLETED', 'CANCELLED'] }
  }

  if (query.from || query.to) {
    const range: Record<string, Date> = {}
    if (query.from) range.$gte = new Date(query.from)
    if (query.to) range.$lte = new Date(query.to)
    filter.orderDate = range
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i')
    filter.$or = [{ orderNumber: rx }, { clientName: rx }, { clientPhone: rx }]
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort(buildSort(query.sort, query.dir, 'orderDate'))
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    Order.countDocuments(filter)
  ])

  return {
    items,
    total,
    page: query.page,
    limit: query.limit,
    pages: Math.max(1, Math.ceil(total / query.limit))
  }
})
