import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

export const MOVEMENT_TYPES = [
  'INTAKE',       // purchase / delivery into the warehouse
  'ADJUSTMENT',   // manual stock-take correction
  'RESERVE',      // soft-reserved against a confirmed order
  'RELEASE',      // reservation returned (order cancelled or rolled back)
  'CONSUME',      // physically cut / used — leaves the warehouse
  'RETURN'        // leftover returned to the shelf
] as const

/** Immutable ledger. Every quantity change to a fabric/accessory writes one row. */
const stockMovementSchema = new Schema(
  {
    materialType: { type: String, required: true, enum: ['FABRIC', 'ACCESSORY'] },
    material: { type: Schema.Types.ObjectId, required: true, refPath: 'materialModel', index: true },
    materialModel: { type: String, required: true, enum: ['Fabric', 'Accessory'] },
    materialName: { type: String, default: '' },
    type: { type: String, required: true, enum: MOVEMENT_TYPES, index: true },
    /** Signed against physical stock: negative for CONSUME, positive for INTAKE. */
    quantity: { type: Number, required: true },
    unit: { type: String, default: '' },
    unitCost: { type: Number, default: 0 },
    balanceAfter: { type: Number, default: 0 },
    order: { type: Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    orderNumber: { type: String, default: '' },
    reason: { type: String, default: '', trim: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: '' }
  },
  { timestamps: true, collection: 'stock_movements' }
)

stockMovementSchema.index({ createdAt: -1 })

export type StockMovementDoc = InferSchemaType<typeof stockMovementSchema> & { _id: Types.ObjectId }

export const StockMovement =
  (models.StockMovement as Model<StockMovementDoc>)
  || model<StockMovementDoc>('StockMovement', stockMovementSchema)
