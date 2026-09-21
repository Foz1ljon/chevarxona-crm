import type { ClientSession, Types as MongooseTypes } from 'mongoose'
import { GarmentCategory } from '../models/GarmentCategory'
import { User } from '../models/User'
import { Fabric } from '../models/Fabric'
import { Accessory } from '../models/Accessory'
import { expandBomTemplate, type AllocationLine } from './stock'
import type { SessionUser } from './auth'
import { hasPermission } from './auth'
import { z, objectId, optionalObjectId, money } from './validation'
import mongoose from 'mongoose'

const { Types } = mongoose

export const allocationInputSchema = z.object({
  materialType: z.enum(['FABRIC', 'ACCESSORY']),
  material: objectId,
  plannedQty: z.coerce.number().min(0).max(100_000),
  consumedQty: z.coerce.number().min(0).max(100_000).default(0)
})

export const orderItemInputSchema = z.object({
  garmentCategory: objectId,
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  unitPrice: money.default(0),
  assignedTailor: optionalObjectId,
  measurements: z.array(z.object({
    key: z.string().trim().min(1).max(40),
    label: z.string().trim().min(1).max(60),
    value: z.coerce.number().min(0).max(400),
    unit: z.string().trim().max(8).default('cm')
  })).default([]),
  measurementProfileName: z.string().trim().max(80).default(''),
  /** Omit to let the garment's BOM template drive the allocation. */
  allocations: z.array(allocationInputSchema).max(40).optional(),
  notes: z.string().trim().max(1000).default(''),
  referenceImages: z.array(z.string().trim().max(1000)).max(10).default([])
})

export type OrderItemInput = z.infer<typeof orderItemInputSchema>

interface ResolvedItem {
  garmentCategory: string
  garmentName: string
  quantity: number
  unitPrice: number
  assignedTailor: string | null
  assignedTailorName: string
  measurements: OrderItemInput['measurements']
  measurementProfileName: string
  allocations: Array<AllocationLine & { name: string, sku: string, unit: string }>
  notes: string
  referenceImages: string[]
}

/**
 * Turns raw item input into fully denormalised order items: resolves the
 * garment name, the tailor name, and — when the caller did not pin materials
 * explicitly — expands the category's BOM template into allocation lines.
 */
export async function resolveOrderItems(
  items: OrderItemInput[],
  session?: ClientSession
): Promise<ResolvedItem[]> {
  if (!items.length) {
    throw apiError('ORDER_NEEDS_GARMENT', 422)
  }

  const categoryIds = [...new Set(items.map(item => item.garmentCategory))]
  const tailorIds = [...new Set(items.map(item => item.assignedTailor).filter(Boolean))] as string[]

  const [categories, tailors] = await Promise.all([
    GarmentCategory.find({ _id: { $in: categoryIds } }).session(session ?? null).lean(),
    tailorIds.length
      ? User.find({ _id: { $in: tailorIds } }).select('fullName roleKey isActive').session(session ?? null).lean()
      : Promise.resolve([])
  ])

  const categoryMap = new Map(categories.map(c => [String(c._id), c]))
  const tailorMap = new Map(tailors.map(t => [String(t._id), t]))

  // Every material referenced across all items, fetched in two queries.
  const explicit = items.flatMap(item => item.allocations ?? [])
  const templateLines = items.flatMap((item) => {
    if (item.allocations) return []
    const category = categoryMap.get(item.garmentCategory)
    return category ? expandBomTemplate(category.bomTemplate as never, item.quantity) : []
  })

  const fabricIds = [...explicit, ...templateLines].filter(l => l.materialType === 'FABRIC').map(l => String(l.material))
  const accessoryIds = [...explicit, ...templateLines].filter(l => l.materialType === 'ACCESSORY').map(l => String(l.material))

  const [fabrics, accessories] = await Promise.all([
    fabricIds.length
      ? Fabric.find({ _id: { $in: fabricIds } }).select('name sku unit costPerUnit').session(session ?? null).lean()
      : Promise.resolve([]),
    accessoryIds.length
      ? Accessory.find({ _id: { $in: accessoryIds } }).select('name sku unit costPerUnit').session(session ?? null).lean()
      : Promise.resolve([])
  ])

  const materialMap = new Map<string, { name: string, sku: string, unit: string, costPerUnit: number }>()
  for (const doc of [...fabrics, ...accessories]) {
    materialMap.set(String(doc._id), {
      name: doc.name,
      sku: doc.sku,
      unit: doc.unit,
      costPerUnit: doc.costPerUnit ?? 0
    })
  }

  return items.map((item) => {
    const category = categoryMap.get(item.garmentCategory)
    if (!category) {
      throw apiError('UNKNOWN_GARMENT_TYPE', 422)
    }

    let tailorName = ''
    if (item.assignedTailor) {
      const tailor = tailorMap.get(item.assignedTailor)
      if (!tailor) throw apiError('ASSIGNED_TAILOR_NOT_FOUND', 422)
      if (!tailor.isActive) {
        throw apiError('TAILOR_DEACTIVATED_ASSIGN', 422, { params: { name: tailor.fullName } })
      }
      tailorName = tailor.fullName
    }

    const rawLines = item.allocations
      ? item.allocations.map(line => ({
          materialType: line.materialType,
          material: String(line.material),
          materialModel: (line.materialType === 'FABRIC' ? 'Fabric' : 'Accessory') as 'Fabric' | 'Accessory',
          plannedQty: line.plannedQty,
          consumedQty: line.consumedQty
        }))
      : expandBomTemplate(category.bomTemplate as never, item.quantity)

    const allocations = rawLines
      .map((line) => {
        const material = materialMap.get(String(line.material))
        if (!material) {
          throw apiError('MATERIAL_MISSING', 422)
        }
        return {
          materialType: line.materialType,
          material: String(line.material),
          materialModel: (line.materialType === 'FABRIC' ? 'Fabric' : 'Accessory') as 'Fabric' | 'Accessory',
          name: material.name,
          sku: material.sku,
          unit: material.unit,
          plannedQty: Number(line.plannedQty.toFixed(3)),
          consumedQty: 'consumedQty' in line ? Number(line.consumedQty ?? 0) : 0,
          unitCost: material.costPerUnit
        }
      })
      .filter(line => line.plannedQty > 0)

    return {
      garmentCategory: item.garmentCategory,
      garmentName: category.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice || category.basePrice || 0,
      assignedTailor: item.assignedTailor ?? null,
      assignedTailorName: tailorName,
      measurements: item.measurements,
      measurementProfileName: item.measurementProfileName,
      allocations,
      notes: item.notes,
      referenceImages: item.referenceImages
    }
  })
}

/** Flattens every allocation on an order into one list for the stock engine. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function collectAllocations(order: { items: any[] }): AllocationLine[] {
  return order.items.flatMap((item: any) =>
    (item.allocations ?? []).map((line: any) => ({
      materialType: line.materialType,
      material: String(line.material),
      materialModel: line.materialModel,
      name: line.name,
      sku: line.sku,
      unit: line.unit,
      plannedQty: line.plannedQty,
      consumedQty: line.consumedQty ?? 0,
      unitCost: line.unitCost ?? 0
    }))
  )
}

/**
 * Tailors hold `orders:read_assigned` instead of `orders:read`; they may only
 * open an order that carries at least one garment assigned to them.
 */
export function assertOrderVisible(order: { items: any[] }, user: SessionUser) {
  if (hasPermission(user, 'orders:read')) return

  const assigned = order.items.some((item: any) => String(item.assignedTailor ?? '') === user.id)
  if (!assigned) {
    throw apiError('ORDER_NOT_ASSIGNED', 403)
  }
}

/**
 * Builds the list filter that scopes tailors to their own work.
 *
 * The id is cast to an ObjectId explicitly: `find()` would coerce the string
 * against the schema, but `aggregate()` does not, and every dashboard/board
 * figure runs through an aggregation pipeline.
 */
export function scopeFilterForUser(user: SessionUser): { 'items.assignedTailor'?: MongooseTypes.ObjectId } {
  if (hasPermission(user, 'orders:read')) return {}
  return { 'items.assignedTailor': new Types.ObjectId(user.id) }
}
