import { ActivityLog } from '../../models/ActivityLog'
import { connectToDatabase } from '../../utils/db'
import { getValidatedQueryOrThrow, objectId, paginationSchema, z } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'

const querySchema = paginationSchema.extend({
  actor: objectId.optional(),
  entity: z.string().trim().max(40).optional(),
  action: z.string().trim().max(60).optional()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'logs:read')
  const { page, limit, search, actor, entity, action } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const filter: Record<string, unknown> = {}
  if (actor) filter.actor = actor
  if (entity) filter.entity = entity
  if (action) filter.action = new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
  if (search) filter.summary = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ActivityLog.countDocuments(filter)
  ])

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
})
