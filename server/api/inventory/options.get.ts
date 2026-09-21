import { Fabric } from '../../models/Fabric'
import { Accessory } from '../../models/Accessory'
import { connectToDatabase } from '../../utils/db'
import { requirePermission } from '../../utils/auth'

/** Lightweight picker feed for the order form's material selectors. */
export default defineEventHandler(async (event) => {
  await requirePermission(event, ['inventory:read', 'orders:create', 'orders:update'])
  await connectToDatabase()

  const projection = {
    name: 1, sku: 1, unit: 1, costPerUnit: 1, stockQty: 1, reservedQty: 1,
    availableQty: { $max: [0, { $subtract: [{ $ifNull: ['$stockQty', 0] }, { $ifNull: ['$reservedQty', 0] }] }] }
  }

  const [fabrics, accessories] = await Promise.all([
    Fabric.aggregate([
      { $match: { isActive: true } },
      { $project: { ...projection, fabricType: 1, color: 1, colorHex: 1, pattern: 1 } },
      { $sort: { name: 1 } }
    ]),
    Accessory.aggregate([
      { $match: { isActive: true } },
      { $project: { ...projection, category: 1, color: 1, size: 1 } },
      { $sort: { name: 1 } }
    ])
  ])

  return { fabrics, accessories }
})
