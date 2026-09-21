import { User } from '../../models/User'
import { Order } from '../../models/Order'
import { connectToDatabase } from '../../utils/db'
import { requirePermission } from '../../utils/auth'

/** Tailor picker feed, annotated with current workload for assignment decisions. */
export default defineEventHandler(async (event) => {
  await requirePermission(event, ['orders:assign', 'orders:create', 'orders:update', 'users:read'])
  await connectToDatabase()

  const tailors = await User.find({ roleKey: 'TAILOR', isActive: true })
    .select('fullName avatarUrl specialties phone')
    .sort({ fullName: 1 })
    .lean()

  const workload = await Order.aggregate([
    { $match: { status: { $nin: ['COMPLETED', 'CANCELLED'] } } },
    { $unwind: '$items' },
    { $match: { 'items.assignedTailor': { $ne: null }, 'items.status': { $ne: 'COMPLETED' } } },
    { $group: { _id: '$items.assignedTailor', activeGarments: { $sum: '$items.quantity' }, orders: { $addToSet: '$_id' } } },
    { $project: { activeGarments: 1, activeOrders: { $size: '$orders' } } }
  ])

  const workloadMap = new Map(workload.map(row => [String(row._id), row]))

  return {
    items: tailors.map(tailor => ({
      ...tailor,
      activeGarments: workloadMap.get(String(tailor._id))?.activeGarments ?? 0,
      activeOrders: workloadMap.get(String(tailor._id))?.activeOrders ?? 0
    }))
  }
})
