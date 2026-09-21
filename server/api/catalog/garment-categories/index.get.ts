import { GarmentCategory } from '../../../models/GarmentCategory'
import { connectToDatabase } from '../../../utils/db'
import { getValidatedQueryOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'

const querySchema = z.object({
  active: z.enum(['true', 'false', 'all']).default('true'),
  populate: z.enum(['true', 'false']).default('false')
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, ['catalog:read', 'orders:read', 'orders:read_assigned'])
  const { active, populate } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const filter = active === 'all' ? {} : { isActive: active === 'true' }
  const query = GarmentCategory.find(filter).sort({ sortOrder: 1, name: 1 })

  if (populate === 'true') {
    // Resolves BOM lines to live material names/stock for the BOM calculator.
    query.populate({ path: 'bomTemplate.material', select: 'name sku unit stockQty reservedQty costPerUnit' })
  }

  return { items: await query.lean() }
})
