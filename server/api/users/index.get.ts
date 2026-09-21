import { User } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { buildSort, escapeRegex, getValidatedQueryOrThrow, paginationSchema, z } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'
import { ROLE_KEYS } from '../../../shared/utils/permissions'

const querySchema = paginationSchema.extend({
  role: z.enum(ROLE_KEYS).optional(),
  active: z.enum(['true', 'false', 'all']).default('all')
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, ['users:read', 'users:manage'])
  const { page, limit, search, sort, dir, role, active } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const filter: Record<string, unknown> = {}
  if (role) filter.roleKey = role
  if (active !== 'all') filter.isActive = active === 'true'
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }]
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .populate('role', 'key name permissions')
      .sort(buildSort(sort, dir))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter)
  ])

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
})
