import { StockMovement } from '../../models/StockMovement'
import { connectToDatabase } from '../../utils/db'
import { objectId, readValidatedBodyOrThrow, z } from '../../utils/validation'
import { modelFor } from '../../utils/stock'
import { requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

const schema = z.object({
  materialType: z.enum(['FABRIC', 'ACCESSORY']),
  material: objectId,
  /** INTAKE adds stock; ADJUSTMENT sets an absolute counted quantity. */
  mode: z.enum(['INTAKE', 'ADJUSTMENT']),
  quantity: z.coerce.number().min(0).max(1_000_000),
  unitCost: z.coerce.number().min(0).max(1_000_000_000).optional(),
  reason: z.string().trim().max(240).default('')
})

/**
 * The single writable path for physical stock outside the order life-cycle.
 * Reserved quantity is never touched here — releasing a reservation is a
 * consequence of an order moving backwards, not a warehouse action.
 */
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, ['inventory:adjust', 'inventory:manage'])
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const Materials = modelFor(input.materialType)
  const material = await Materials.findById(input.material)
  if (!material) throw apiError('MATERIAL_NOT_FOUND', 404)

  const before = material.stockQty ?? 0
  const delta = input.mode === 'INTAKE' ? input.quantity : input.quantity - before

  if (input.mode === 'ADJUSTMENT' && input.quantity < (material.reservedQty ?? 0)) {
    throw apiError('ADJUST_BELOW_RESERVED', 409, {
      params: { counted: input.quantity, reserved: material.reservedQty }
    })
  }

  if (delta === 0) {
    return { ok: true, unchanged: true, stockQty: before }
  }

  material.stockQty = Math.max(0, before + delta)
  if (input.mode === 'INTAKE' && input.unitCost !== undefined) {
    // Weighted-average cost so stock valuation follows the real purchase price.
    const totalValue = before * (material.costPerUnit ?? 0) + input.quantity * input.unitCost
    material.costPerUnit = material.stockQty > 0 ? Math.round(totalValue / material.stockQty) : input.unitCost
  }
  await material.save()

  await StockMovement.create({
    materialType: input.materialType,
    material: material._id,
    materialModel: input.materialType === 'FABRIC' ? 'Fabric' : 'Accessory',
    materialName: material.name,
    type: input.mode,
    quantity: delta,
    unit: material.unit,
    unitCost: input.unitCost ?? material.costPerUnit ?? 0,
    balanceAfter: material.stockQty,
    reason: input.reason || (input.mode === 'INTAKE' ? 'Stock intake' : 'Stock count correction'),
    performedBy: user.id,
    performedByName: user.fullName
  })

  logActivity(event, user, {
    action: `inventory.${input.mode.toLowerCase()}`,
    entity: input.materialType === 'FABRIC' ? 'Fabric' : 'Accessory',
    entityId: String(material._id),
    summary: `${input.mode === 'INTAKE' ? 'Received' : 'Corrected'} ${material.name}: ${before} → ${material.stockQty} ${material.unit}`,
    meta: { delta, reason: input.reason }
  })

  return {
    ok: true,
    stockQty: material.stockQty,
    reservedQty: material.reservedQty ?? 0,
    availableQty: Math.max(0, material.stockQty - (material.reservedQty ?? 0)),
    delta
  }
})
