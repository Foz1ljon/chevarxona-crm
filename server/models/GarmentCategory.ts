import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

/**
 * Declares which measurement inputs the dynamic measurement card renders
 * when this garment type is selected on an order.
 */
const measurementFieldSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    unit: { type: String, default: 'cm', trim: true },
    required: { type: Boolean, default: false },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 400 },
    hint: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 }
  },
  { _id: false }
)

/** BOM line: an estimated material draw per garment produced. */
const bomLineSchema = new Schema(
  {
    materialType: { type: String, required: true, enum: ['FABRIC', 'ACCESSORY'] },
    /** Optional concrete item; when null the line is a placeholder the order must fill. */
    material: { type: Schema.Types.ObjectId, default: null, refPath: 'bomTemplate.materialModel' },
    materialModel: { type: String, enum: ['Fabric', 'Accessory'], default: 'Fabric' },
    /** Used when no concrete material is pinned — e.g. "Main fabric", "Buttons". */
    accessoryCategory: { type: String, default: '' },
    label: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'm', trim: true },
    /** Extra % added to cover cutting loss. */
    wastagePercent: { type: Number, default: 0, min: 0, max: 100 },
    optional: { type: Boolean, default: false }
  },
  { _id: false }
)

const garmentCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', trim: true },
    icon: { type: String, default: 'i-lucide-shirt' },
    basePrice: { type: Number, default: 0, min: 0 },
    /** Default working days used to suggest a deadline. */
    estimatedDays: { type: Number, default: 7, min: 0 },
    measurementFields: { type: [measurementFieldSchema], default: [] },
    bomTemplate: { type: [bomLineSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 }
  },
  { timestamps: true, collection: 'garment_categories' }
)

export type GarmentCategoryDoc = InferSchemaType<typeof garmentCategorySchema> & { _id: Types.ObjectId }

export const GarmentCategory =
  (models.GarmentCategory as Model<GarmentCategoryDoc>)
  || model<GarmentCategoryDoc>('GarmentCategory', garmentCategorySchema)
