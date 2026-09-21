import { User } from '../../models/User'
import { Order } from '../../models/Order'
import { connectToDatabase } from '../../utils/db'
import { objectId, parseOrThrow } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

/** Staff accounts are deactivated, never deleted — they are referenced by orders. */
export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users:manage')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  if (id === actor.id) {
    throw apiError('SELF_DEACTIVATE', 409)
  }

  await connectToDatabase()

  const user = await User.findById(id)
  if (!user) throw apiError('USER_NOT_FOUND', 404)

  if (user.roleKey === 'SUPER_ADMIN') {
    const remaining = await User.countDocuments({ roleKey: 'SUPER_ADMIN', isActive: true, _id: { $ne: id } })
    if (remaining === 0) {
      throw apiError('LAST_SUPER_ADMIN', 409)
    }
  }

  const openWork = await Order.countDocuments({
    'items.assignedTailor': id,
    status: { $nin: ['COMPLETED', 'CANCELLED'] }
  })

  user.isActive = false
  await user.save()

  logActivity(event, actor, {
    action: 'user.deactivate',
    entity: 'User',
    entityId: id,
    summary: `Deactivated ${user.fullName}`,
    meta: { openWork }
  })

  return { ok: true, deactivated: true, openWork }
})
