import { Fabric } from '../../models/Fabric'
import { Accessory } from '../../models/Accessory'
import { connectToDatabase } from '../../utils/db'
import { requirePermission } from '../../utils/auth'

const lowStockPipeline = (materialType: 'FABRIC' | 'ACCESSORY') => [
  { $match: { isActive: true } },
  {
    $addFields: {
      availableQty: {
        $max: [0, { $subtract: [{ $ifNull: ['$stockQty', 0] }, { $ifNull: ['$reservedQty', 0] }] }]
      }
    }
  },
  { $match: { $expr: { $lte: ['$availableQty', { $ifNull: ['$minThreshold', 0] }] } } },
  {
    $project: {
      name: 1, sku: 1, unit: 1, stockQty: 1, reservedQty: 1, availableQty: 1,
      minThreshold: 1, costPerUnit: 1, imageUrl: 1, colorHex: 1,
      materialType: { $literal: materialType },
      // How far below the reorder point the item sits, used to rank alerts.
      deficit: { $subtract: [{ $ifNull: ['$minThreshold', 0] }, '$availableQty'] }
    }
  },
  { $sort: { deficit: -1 as const } }
]

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inventory:read')
  await connectToDatabase()

  const [fabrics, accessories] = await Promise.all([
    Fabric.aggregate(lowStockPipeline('FABRIC')),
    Accessory.aggregate(lowStockPipeline('ACCESSORY'))
  ])

  const items = [...fabrics, ...accessories].sort((a, b) => b.deficit - a.deficit)

  return {
    items,
    total: items.length,
    outOfStock: items.filter(item => item.availableQty <= 0).length
  }
})
