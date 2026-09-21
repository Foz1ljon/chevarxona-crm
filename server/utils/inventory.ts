import type { H3Event } from 'h3'
import type { Model } from 'mongoose'
import { buildSort, escapeRegex, getValidatedQueryOrThrow, paginationSchema, z } from './validation'

export const inventoryQuerySchema = paginationSchema.extend({
  stock: z.enum(['all', 'low', 'out', 'available']).default('all'),
  type: z.string().trim().max(40).optional(),
  active: z.enum(['true', 'false', 'all']).default('true')
})

/**
 * Shared list pipeline for fabrics and accessories. `availableQty` is a virtual
 * (stock − reserved) so low-stock filtering and sorting must happen inside the
 * aggregation rather than on the hydrated documents.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listInventory(
  event: H3Event,
  Materials: Model<any>,
  typeField: 'fabricType' | 'category'
) {
  const { page, limit, search, sort, dir, stock, type, active } =
    getValidatedQueryOrThrow(event, inventoryQuerySchema)

  const match: Record<string, unknown> = {}
  if (active !== 'all') match.isActive = active === 'true'
  if (type) match[typeField] = type

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    match.$or = [{ name: rx }, { sku: rx }, { color: rx }, { supplier: rx }]
  }

  const availableExpr = {
    $max: [0, { $subtract: [{ $ifNull: ['$stockQty', 0] }, { $ifNull: ['$reservedQty', 0] }] }]
  }

  const stockMatch: Record<string, unknown> = {}
  if (stock === 'low') {
    stockMatch.$expr = { $lte: ['$availableQty', { $ifNull: ['$minThreshold', 0] }] }
  } else if (stock === 'out') {
    stockMatch.availableQty = { $lte: 0 }
  } else if (stock === 'available') {
    stockMatch.availableQty = { $gt: 0 }
  }

  const pipeline: any[] = [
    { $match: match },
    { $addFields: { availableQty: availableExpr } },
    { $addFields: { isLowStock: { $lte: ['$availableQty', { $ifNull: ['$minThreshold', 0] }] } } },
    ...(Object.keys(stockMatch).length ? [{ $match: stockMatch }] : []),
    {
      $facet: {
        items: [
          { $sort: buildSort(sort, dir) },
          { $skip: (page - 1) * limit },
          { $limit: limit }
        ],
        meta: [{ $count: 'total' }],
        summary: [{
          $group: {
            _id: null,
            stockValue: { $sum: { $multiply: ['$stockQty', { $ifNull: ['$costPerUnit', 0] }] } },
            lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } }
          }
        }]
      }
    }
  ]

  const [result] = await Materials.aggregate(pipeline)
  const total = result?.meta?.[0]?.total ?? 0

  return {
    items: result?.items ?? [],
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    summary: {
      stockValue: result?.summary?.[0]?.stockValue ?? 0,
      lowStockCount: result?.summary?.[0]?.lowStockCount ?? 0
    }
  }
}

/** Normalises a SKU and guarantees uniqueness within its collection. */
export async function assertUniqueSku(Materials: Model<any>, sku: string, excludeId?: string) {
  const existing = await Materials.findOne({ sku: sku.toUpperCase() }).select('_id name').lean()
  if (existing && String(existing._id) !== excludeId) {
    throw apiError('VALIDATION_FAILED', 409, {
      data: {
        errors: [{
          name: 'sku',
          message: 'FIELD_SKU_TAKEN',
          params: { name: existing.name }
        }]
      }
    })
  }
}
