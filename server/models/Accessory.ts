import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

export const ACCESSORY_CATEGORIES = [
  'BUTTON', 'ZIPPER', 'THREAD', 'INTERLINING', 'ELASTIC',
  'LABEL', 'HANGER', 'BAG', 'LINING', 'HOOK', 'OTHER'
] as const

export const ACCESSORY_UNITS = ['pcs', 'spool', 'pack', 'm', 'set', 'roll'] as const

const accessorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    category: { type: String, required: true, enum: ACCESSORY_CATEGORIES, default: 'OTHER', index: true },
    unit: { type: String, required: true, enum: ACCESSORY_UNITS, default: 'pcs' },
    color: { type: String, default: '', trim: true },
    size: { type: String, default: '', trim: true },
    stockQty: { type: Number, default: 0, min: 0 },
    reservedQty: { type: Number, default: 0, min: 0 },
    minThreshold: { type: Number, default: 20, min: 0 },
    costPerUnit: { type: Number, default: 0, min: 0 },
    supplier: { type: String, default: '', trim: true },
    imageUrl: { type: String, default: '' },
    location: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true, index: true }
  },
  {
    timestamps: true,
    collection: 'accessories',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
)

accessorySchema.virtual('availableQty').get(function () {
  return Math.max(0, (this.stockQty ?? 0) - (this.reservedQty ?? 0))
})

accessorySchema.virtual('isLowStock').get(function () {
  return (this.stockQty ?? 0) - (this.reservedQty ?? 0) <= (this.minThreshold ?? 0)
})

accessorySchema.index({ name: 'text', sku: 'text' })

export type AccessoryDoc = InferSchemaType<typeof accessorySchema> & { _id: Types.ObjectId }

export const Accessory = (models.Accessory as Model<AccessoryDoc>) || model<AccessoryDoc>('Accessory', accessorySchema)
