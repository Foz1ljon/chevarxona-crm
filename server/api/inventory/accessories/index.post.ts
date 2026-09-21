import { Accessory, ACCESSORY_CATEGORIES, ACCESSORY_UNITS } from '../../../models/Accessory'
import { StockMovement } from '../../../models/StockMovement'
import { connectToDatabase } from '../../../utils/db'
import { money, quantity, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { assertUniqueSku } from '../../../utils/inventory'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export const accessoryInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(40).transform(v => v.toUpperCase()),
  category: z.enum(ACCESSORY_CATEGORIES),
  unit: z.enum(ACCESSORY_UNITS).default('pcs'),
  color: z.string().trim().max(60).default(''),
  size: z.string().trim().max(40).default(''),
  stockQty: quantity.default(0),
  minThreshold: quantity.default(20),
  costPerUnit: money.default(0),
  supplier: z.string().trim().max(120).default(''),
  imageUrl: z.string().trim().max(500).default(''),
  location: z.string().trim().max(60).default(''),
  notes: z.string().trim().max(1000).default('')
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:create', 'inventory:manage'])
  const input = await readValidatedBodyOrThrow(event, accessoryInputSchema)

  await connectToDatabase()
  await assertUniqueSku(Accessory, input.sku)

  const accessory = await Accessory.create(input)

  if (input.stockQty > 0) {
    await StockMovement.create({
      materialType: 'ACCESSORY',
      material: accessory._id,
      materialModel: 'Accessory',
      materialName: accessory.name,
      type: 'INTAKE',
      quantity: input.stockQty,
      unit: accessory.unit,
      unitCost: accessory.costPerUnit,
      balanceAfter: accessory.stockQty,
      reason: 'Opening balance',
      performedBy: user.id,
      performedByName: user.fullName
    })
  }

  logActivity(event, user, {
    action: 'accessory.create',
    entity: 'Accessory',
    entityId: String(accessory._id),
    summary: `Added accessory ${accessory.name} (${accessory.sku})`
  })

  return accessory.toObject()
})
