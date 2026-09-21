import { Fabric, FABRIC_TYPES } from '../../../models/Fabric'
import { connectToDatabase } from '../../../utils/db'
import { money, quantity, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { assertUniqueSku } from '../../../utils/inventory'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import { StockMovement } from '../../../models/StockMovement'

export const fabricInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  sku: z.string().trim().min(2).max(40).transform(v => v.toUpperCase()),
  fabricType: z.enum(FABRIC_TYPES),
  pattern: z.string().trim().max(60).default(''),
  color: z.string().trim().max(60).default(''),
  colorHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'FIELD_COLOUR_HEX').default('#94a3b8'),
  unit: z.enum(['m', 'yd']).default('m'),
  stockQty: quantity.default(0),
  minThreshold: quantity.default(5),
  costPerUnit: money.default(0),
  supplier: z.string().trim().max(120).default(''),
  imageUrl: z.string().trim().max(500).default(''),
  location: z.string().trim().max(60).default(''),
  notes: z.string().trim().max(1000).default('')
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:create', 'inventory:manage'])
  const input = await readValidatedBodyOrThrow(event, fabricInputSchema)

  await connectToDatabase()
  await assertUniqueSku(Fabric, input.sku)

  const fabric = await Fabric.create(input)

  // Opening balance is part of the ledger so stock value always reconciles.
  if (input.stockQty > 0) {
    await StockMovement.create({
      materialType: 'FABRIC',
      material: fabric._id,
      materialModel: 'Fabric',
      materialName: fabric.name,
      type: 'INTAKE',
      quantity: input.stockQty,
      unit: fabric.unit,
      unitCost: fabric.costPerUnit,
      balanceAfter: fabric.stockQty,
      reason: 'Opening balance',
      performedBy: user.id,
      performedByName: user.fullName
    })
  }

  logActivity(event, user, {
    action: 'fabric.create',
    entity: 'Fabric',
    entityId: String(fabric._id),
    summary: `Added fabric ${fabric.name} (${fabric.sku})`
  })

  return fabric.toObject()
})
