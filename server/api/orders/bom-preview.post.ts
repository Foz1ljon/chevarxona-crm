import { connectToDatabase } from '../../utils/db'
import { readValidatedBodyOrThrow, z } from '../../utils/validation'
import { collectAllocations, orderItemInputSchema, resolveOrderItems } from '../../utils/orders'
import { findShortages, mergeAllocations } from '../../utils/stock'
import { requirePermission } from '../../utils/auth'

const schema = z.object({
  items: z.array(orderItemInputSchema).min(1).max(30)
})

/**
 * Powers the BOM calculator in the order form: expands templates, merges
 * duplicate materials and reports shortages — all without touching stock.
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, ['orders:create', 'orders:update'])
  const { items } = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const resolved = await resolveOrderItems(items)
  const allocations = collectAllocations({ items: resolved })
  const merged = mergeAllocations(allocations)
  const shortages = await findShortages(merged)

  const shortageMap = new Map(shortages.map(s => [s.material, s]))

  const lines = merged.map(line => ({
    ...line,
    estimatedCost: Math.round(line.plannedQty * (line.unitCost ?? 0)),
    shortage: shortageMap.get(String(line.material)) ?? null
  }))

  return {
    lines,
    shortages,
    canAllocate: shortages.length === 0,
    materialCost: lines.reduce((sum, line) => sum + line.estimatedCost, 0),
    itemBreakdown: resolved.map(item => ({
      garmentName: item.garmentName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
      allocations: item.allocations
    })),
    subtotal: resolved.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }
})
