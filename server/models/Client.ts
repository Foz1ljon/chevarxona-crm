import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

/** One captured measurement value, e.g. { key: 'chest', value: 104, unit: 'cm' } */
const measurementValueSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    value: { type: Number, required: true },
    unit: { type: String, default: 'cm', trim: true }
  },
  { _id: false }
)

/**
 * A versioned measurement profile. Editing never mutates history — the API
 * pushes a new revision so an old order always keeps the numbers it was cut to.
 */
const measurementProfileSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    garmentCategory: { type: Schema.Types.ObjectId, ref: 'GarmentCategory', default: null },
    garmentCategoryName: { type: String, default: '' },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    values: { type: [measurementValueSchema], default: [] },
    notes: { type: String, default: '', trim: true },
    takenBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    takenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
)

const clientSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, index: 'text' },
    phone: { type: String, required: true, trim: true, index: true },
    secondaryPhone: { type: String, default: '', trim: true },
    telegramId: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
    tags: { type: [String], default: [] },
    /** Denormalised counters kept in step by the order API. */
    totalOrders: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    debtBalance: { type: Number, default: 0 },
    lastOrderAt: { type: Date, default: null },
    measurements: { type: [measurementProfileSchema], default: [] },
    isArchived: { type: Boolean, default: false, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true, collection: 'clients' }
)

clientSchema.index({ fullName: 'text', phone: 'text', telegramId: 'text' })

export type ClientDoc = InferSchemaType<typeof clientSchema> & { _id: Types.ObjectId }

export const Client = (models.Client as Model<ClientDoc>) || model<ClientDoc>('Client', clientSchema)
