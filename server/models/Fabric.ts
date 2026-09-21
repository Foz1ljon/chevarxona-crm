import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

export const FABRIC_TYPES = [
  'SILK', 'COTTON', 'WOOL', 'LINEN', 'CASHMERE', 'VELVET',
  'POLYESTER', 'DENIM', 'SATIN', 'ATLAS', 'ADRAS', 'OTHER'
] as const

const fabricSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fabricType: { type: String, required: true, enum: FABRIC_TYPES, default: 'COTTON', index: true },
    pattern: { type: String, default: '', trim: true },
    color: { type: String, default: '', trim: true },
    colorHex: { type: String, default: '#94a3b8', trim: true },
    unit: { type: String, default: 'm', enum: ['m', 'yd'] },
    /** Physical quantity on the shelf. */
    stockQty: { type: Number, default: 0, min: 0 },
    /** Soft-reserved for confirmed orders; available = stockQty - reservedQty. */
    reservedQty: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 5, min: 0 },
    costPerUnit: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '' },
    location: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    collection: 'fabrics',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

fabricSchema.virtual('availableQty').get(function () {
  return Math.max(0, (this.stockQty ?? 0) - (this.reservedQty ?? 0))
})

fabricSchema.virtual('isLowStock').get(function () {
  return (this.stockQty ?? 0) - (this.reservedQty ?? 0) <= (this.minThreshold ?? 0)
})

fabricSchema.index({ name: 'text', sku: 'text', color: 'text', pattern: 'text' })

export type FabricDoc = InferSchemaType<typeof fabricSchema> & { _id: Types.ObjectId }

export const Fabric = (models.Fabric as Model<FabricDoc>) || model<FabricDoc>('Fabric', fabricSchema)
