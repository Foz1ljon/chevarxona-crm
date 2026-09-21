import { Order } from '../../models/Order'
import { connectToDatabase } from '../../utils/db'
import { getValidatedQueryOrThrow, objectId, z } from '../../utils/validation'
import { requireAuth, hasPermission } from '../../utils/auth'
import { scopeFilterForUser } from '../../utils/orders'
import { KANBAN_STATUSES } from '../../../shared/utils/orderStatus'

const querySchema = z.object({
  tailor: objectId.optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  search: z.string().trim().max(120).optional(),
  /** Cap per lane so a workshop with thousands of orders still renders fast. */
  perLane: z.coerce.number().int().min(5).max(100).default(40)
})

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  if (!hasPermission(user, ['orders:read', 'orders:read_assigned'])) {
    throw apiError('PERMISSION_DENIED', 403, { params: { permission: 'orders:read' } })
  }

  const { tailor, priority, search, perLane } = getValidatedQueryOrThrow(event, querySchema)
  await connectToDatabase()

  const match: Record<string, unknown> = {
    ...scopeFilterForUser(user),
    status: { $in: KANBAN_STATUSES }
  }
  if (tailor) match['items.assignedTailor'] = tailor
  if (priority) match.priority = priority
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [{ orderNumber: rx }, { clientName: rx }, { clientPhone: rx }]
  }

  const grouped = await Order.aggregate([
    { $match: match },
    { $sort: { priority: -1, deadline: 1, createdAt: -1 } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        value: { $sum: '$totalPrice' },
        outstanding: { $sum: '$balanceDue' },
        orders: {
          $push: {
            _id: '$_id',
            orderNumber: '$orderNumber',
            client: '$client',
            clientName: '$clientName',
            clientPhone: '$clientPhone',
            status: '$status',
            priority: '$priority',
            orderDate: '$orderDate',
            fittingDate: '$fittingDate',
            deadline: '$deadline',
            totalPrice: '$totalPrice',
            balanceDue: '$balanceDue',
            itemCount: { $size: '$items' },
            garments: '$items.garmentName',
            tailors: '$items.assignedTailorName'
          }
        }
      }
    },
    { $project: { count: 1, value: 1, outstanding: 1, orders: { $slice: ['$orders', perLane] } } }
  ])

  const byStatus = new Map(grouped.map(group => [group._id, group]))

  return {
    lanes: KANBAN_STATUSES.map(status => ({
      status,
      count: byStatus.get(status)?.count ?? 0,
      value: byStatus.get(status)?.value ?? 0,
      outstanding: byStatus.get(status)?.outstanding ?? 0,
      orders: byStatus.get(status)?.orders ?? []
    })),
    canDrag: hasPermission(user, 'orders:status_change')
  }
})
