import { Role } from '../../models/Role'
import { User } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { requirePermission } from '../../utils/auth'
import { PERMISSION_GROUPS, ROLE_META } from '../../../shared/utils/permissions'

export default defineEventHandler(async (event) => {
  await requirePermission(event, ['roles:manage', 'users:read'])
  await connectToDatabase()

  const [roles, counts] = await Promise.all([
    Role.find().lean(),
    User.aggregate([{ $group: { _id: '$roleKey', total: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }])
  ])

  const countMap = new Map(counts.map(row => [row._id, row]))

  return {
    items: roles
      .map(role => ({
        ...role,
        meta: ROLE_META[role.key as keyof typeof ROLE_META],
        userCount: countMap.get(role.key)?.total ?? 0,
        activeUserCount: countMap.get(role.key)?.active ?? 0
      }))
      .sort((a, b) => (a.key === 'SUPER_ADMIN' ? -1 : b.key === 'SUPER_ADMIN' ? 1 : a.name.localeCompare(b.name))),
    // The catalogue drives the permission matrix UI.
    groups: PERMISSION_GROUPS
  }
})
