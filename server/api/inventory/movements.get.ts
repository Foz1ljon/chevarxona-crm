import { StockMovement } from '../../models/StockMovement'
import { connectToDatabase } from '../../utils/db'
import { getValidatedQueryOrThrow, objectId, paginationSchema, z } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'

const querySchema = paginationSchema.extend({
  material: objectId.optional(),
  order: objectId.optional(),
  type: z.string().trim().max(20).optional()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inventory:read')
  const { page, limit, material, order, type } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const filter: Record<string, unknown> = {}
  if (material) filter.material = material
  if (order) filter.order = order
  if (type) filter.type = type

  const [items, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StockMovement.countDocuments(filter)
  ])

  return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
})
