import type { ClientSession, Model } from 'mongoose'
import { Fabric } from '../models/Fabric'
import { Accessory } from '../models/Accessory'
import { StockMovement } from '../models/StockMovement'
import type { SessionUser } from './auth'

export type MaterialType = 'FABRIC' | 'ACCESSORY'
export type StockPhase = 'none' | 'reserved' | 'consumed'

export interface AllocationLine {
  materialType: MaterialType
  material: string
  materialModel: 'Fabric' | 'Accessory'
  name?: string
  sku?: string
  unit?: string
  plannedQty: number
  consumedQty?: number
  unitCost?: number
}

export interface Shortage {
  material: string
  name: string
  sku: string
  unit: string
  required: number
  available: number
  missing: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function modelFor(materialType: MaterialType): Model<any> {
  return materialType === 'FABRIC' ? (Fabric as Model<any>) : (Accessory as Model<any>)
}

/** Collapses duplicate lines so one material is reserved once, not per garment row. */
export function mergeAllocations(lines: AllocationLine[]): AllocationLine[] {
  const merged = new Map<string, AllocationLine>()

  for (const line of lines) {
    const key = `${line.materialType}:${String(line.material)}`
    const existing = merged.get(key)
    if (existing) {
      existing.plannedQty += line.plannedQty
      existing.consumedQty = (existing.consumedQty ?? 0) + (line.consumedQty ?? 0)
    } else {
      merged.set(key, { ...line, consumedQty: line.consumedQty ?? 0 })
    }
  }

  return [...merged.values()]
}

/**
 * Pre-flight check used by the order form and by every phase change:
 * reports what cannot be covered instead of half-applying the reservation.
 */
export async function findShortages(
  lines: AllocationLine[],
  session?: ClientSession
): Promise<Shortage[]> {
  const shortages: Shortage[] = []

  for (const line of mergeAllocations(lines)) {
    const Materials = modelFor(line.materialType)
    const doc = await Materials.findById(line.material)
      .select('name sku unit stockQty reservedQty')
      .session(session ?? null)
      .lean()

    if (!doc) {
      shortages.push({
        material: String(line.material),
        // Empty name lets the client fall back to a localized placeholder.
        name: line.name ?? '',
        sku: line.sku ?? '',
        unit: line.unit ?? '',
        required: line.plannedQty,
        available: 0,
        missing: line.plannedQty
      })
      continue
    }

    const available = Math.max(0, (doc.stockQty ?? 0) - (doc.reservedQty ?? 0))
    if (available + 1e-9 < line.plannedQty) {
      shortages.push({
        material: String(doc._id),
        name: doc.name,
        sku: doc.sku,
        unit: doc.unit,
        required: line.plannedQty,
        available,
        missing: Number((line.plannedQty - available).toFixed(3))
      })
    }
  }

  return shortages
}

interface MovementContext {
  session?: ClientSession
  actor?: SessionUser | null
  orderId?: string
  orderNumber?: string
  reason?: string
}

async function writeMovement(
  line: AllocationLine,
  type: 'RESERVE' | 'RELEASE' | 'CONSUME' | 'RETURN',
  quantity: number,
  balanceAfter: number,
  ctx: MovementContext
) {
  await StockMovement.create(
    [{
      materialType: line.materialType,
      material: line.material,
      materialModel: line.materialModel,
      materialName: line.name ?? '',
      type,
      quantity,
      unit: line.unit ?? '',
      unitCost: line.unitCost ?? 0,
      balanceAfter,
      order: ctx.orderId ?? null,
      orderNumber: ctx.orderNumber ?? '',
      reason: ctx.reason ?? '',
      performedBy: ctx.actor?.id ?? null,
      performedByName: ctx.actor?.fullName ?? 'System'
    }],
    { session: ctx.session, ordered: true }
  )
}

/**
 * Atomically moves `quantity` between the physical and reserved buckets of one
 * material. The `$gte` guard in the filter makes the update a compare-and-swap,
 * so two concurrent orders can never drive stock negative even without a
 * transaction.
 */
async function adjustMaterial(
  line: AllocationLine,
  deltas: { stock?: number, reserved?: number },
  ctx: MovementContext
) {
  const Materials = modelFor(line.materialType)
  const filter: Record<string, unknown> = { _id: line.material }
  const inc: Record<string, number> = {}

  if (deltas.stock) {
    inc.stockQty = deltas.stock
    if (deltas.stock < 0) filter.stockQty = { $gte: -deltas.stock }
  }
  if (deltas.reserved) {
    inc.reservedQty = deltas.reserved
    if (deltas.reserved < 0) filter.reservedQty = { $gte: -deltas.reserved }
  }
  if (!Object.keys(inc).length) return null

  const updated = await Materials.findOneAndUpdate(filter, { $inc: inc }, {
    returnDocument: 'after',
    session: ctx.session
  }).select('name sku unit stockQty reservedQty')

  if (!updated) {
    throw apiError('STOCK_CONFLICT', 409, {
      params: { name: line.name || line.sku || String(line.material) }
    })
  }

  return updated
}

/**
 * Drives an order between stock phases. Every path is expressed as an explicit
 * pair so rolling a status backwards restores exactly what the forward move took.
 */
export async function transitionStockPhase(
  lines: AllocationLine[],
  from: StockPhase,
  to: StockPhase,
  ctx: MovementContext
): Promise<void> {
  if (from === to) return

  const merged = mergeAllocations(lines).filter(line => line.plannedQty > 0 || (line.consumedQty ?? 0) > 0)
  if (!merged.length) return

  // Actual quantity taken off the shelf: what the tailor logged, else the plan.
  const takenQty = (line: AllocationLine) =>
    (line.consumedQty ?? 0) > 0 ? line.consumedQty! : line.plannedQty

  if (from === 'none' && to === 'reserved') {
    const shortages = await findShortages(merged, ctx.session)
    if (shortages.length) {
      throw apiError('INSUFFICIENT_STOCK', 409, { data: { shortages } })
    }
    for (const line of merged) {
      const doc = await adjustMaterial(line, { reserved: line.plannedQty }, ctx)
      await writeMovement(line, 'RESERVE', line.plannedQty, doc!.stockQty, ctx)
    }
    return
  }

  if (from === 'reserved' && to === 'none') {
    for (const line of merged) {
      const doc = await adjustMaterial(line, { reserved: -line.plannedQty }, ctx)
      await writeMovement(line, 'RELEASE', line.plannedQty, doc!.stockQty, ctx)
    }
    return
  }

  if (from === 'reserved' && to === 'consumed') {
    for (const line of merged) {
      const qty = takenQty(line)
      const doc = await adjustMaterial(line, { reserved: -line.plannedQty, stock: -qty }, ctx)
      await writeMovement(line, 'CONSUME', -qty, doc!.stockQty, ctx)
    }
    return
  }

  if (from === 'consumed' && to === 'reserved') {
    for (const line of merged) {
      const qty = takenQty(line)
      const doc = await adjustMaterial(line, { stock: qty, reserved: line.plannedQty }, ctx)
      await writeMovement(line, 'RETURN', qty, doc!.stockQty, ctx)
    }
    return
  }

  if (from === 'consumed' && to === 'none') {
    for (const line of merged) {
      const qty = takenQty(line)
      const doc = await adjustMaterial(line, { stock: qty }, ctx)
      await writeMovement(line, 'RETURN', qty, doc!.stockQty, ctx)
    }
    return
  }

  if (from === 'none' && to === 'consumed') {
    // Reached when an order is dragged straight from DRAFT into cutting.
    await transitionStockPhase(merged, 'none', 'reserved', ctx)
    await transitionStockPhase(merged, 'reserved', 'consumed', ctx)
  }
}

/** Expands a garment category's BOM template into concrete allocation lines. */
export function expandBomTemplate(
  template: Array<{
    materialType: MaterialType
    material?: unknown
    materialModel?: 'Fabric' | 'Accessory'
    label: string
    quantity: number
    unit?: string
    wastagePercent?: number
    optional?: boolean
  }>,
  garmentQuantity: number
) {
  return template
    .filter(line => line.material)
    .map(line => ({
      materialType: line.materialType,
      material: String(line.material),
      materialModel: line.materialModel ?? (line.materialType === 'FABRIC' ? 'Fabric' : 'Accessory'),
      label: line.label,
      unit: line.unit ?? '',
      optional: line.optional ?? false,
      plannedQty: Number(
        (line.quantity * garmentQuantity * (1 + (line.wastagePercent ?? 0) / 100)).toFixed(3)
      )
    }))
}
