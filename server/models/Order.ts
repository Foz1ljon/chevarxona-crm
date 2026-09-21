import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
import { ORDER_STATUSES, ITEM_STATUSES } from '../../shared/utils/orderStatus'
const { Schema, model, models } = mongoose

/** Snapshot of the measurements the garment was actually cut to. */
const measurementSnapshotSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String, default: 'cm' }
  },
  { _id: false }
)

/**
 * One allocated material line. `plannedQty` drives reservation, `consumedQty`
 * is what the tailor actually logged — the difference is returned to stock.
 */
const allocationSchema = new Schema(
  {
    materialType: { type: String, required: true, enum: ['FABRIC', 'ACCESSORY'] },
    material: { type: Schema.Types.ObjectId, required: true, refPath: 'items.allocations.materialModel' },
    materialModel: { type: String, required: true, enum: ['Fabric', 'Accessory'] },
    name: { type: String, default: '' },
    sku: { type: String, default: '' },
    unit: { type: String, default: 'm' },
    plannedQty: { type: Number, required: true, min: 0 },
    consumedQty: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
)

const orderItemSchema = new Schema(
  {
    garmentCategory: { type: Schema.Types.ObjectId, ref: 'GarmentCategory', required: true },
    garmentName: { type: String, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    unitPrice: { type: Number, default: 0, min: 0 },
    assignedTailor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedTailorName: { type: String, default: '' },
    status: { type: String, enum: ITEM_STATUSES, default: 'PENDING', index: true },
    measurements: { type: [measurementSnapshotSchema], default: [] },
    measurementProfileName: { type: String, default: '' },
    allocations: { type: [allocationSchema], default: [] },
    notes: { type: String, default: '', trim: true },
    referenceImages: { type: [String], default: [] },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null }
  },
  { timestamps: true }
)

const paymentSchema = new Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: ['CASH', 'CARD', 'TRANSFER', 'OTHER'], default: 'CASH' },
    note: { type: String, default: '', trim: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    receivedAt: { type: Date, default: Date.now }
  },
  { _id: true }
)

const statusEventSchema = new Schema(
  {
    from: { type: String, default: null },
    to: { type: String, required: true },
    note: { type: String, default: '' },
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
)

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    client: { type: Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    clientName: { type: String, default: '' },
    clientPhone: { type: String, default: '' },
    status: { type: String, enum: ORDER_STATUSES, default: 'DRAFT', index: true },
    orderDate: { type: Date, default: Date.now, index: true },
    fittingDate: { type: Date, default: null, index: true },
    deadline: { type: Date, default: null, index: true },
    items: { type: [orderItemSchema], default: [] },
    /** Money is stored in minor-unit-free integers (UZS has no practical cents). */
    subtotal: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    totalPrice: { type: Number, default: 0, min: 0 },
    advancePayment: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0 },
    payments: { type: [paymentSchema], default: [] },
    priority: { type: String, enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL', index: true },
    notes: { type: String, default: '', trim: true },
    /** Tracks whether stock has been reserved/consumed so transitions stay idempotent. */
    stockPhase: { type: String, enum: ['none', 'reserved', 'consumed'], default: 'none' },
    statusHistory: { type: [statusEventSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    cancelReason: { type: String, default: '' }
  },
  { timestamps: true, collection: 'orders' }
)

orderSchema.index({ status: 1, deadline: 1 })
orderSchema.index({ 'items.assignedTailor': 1, status: 1 })
orderSchema.index({ orderNumber: 'text', clientName: 'text', clientPhone: 'text' })

/** Keeps derived money fields consistent regardless of which route mutated the order. */
orderSchema.methods.recalculateTotals = function () {
  this.subtotal = this.items.reduce(
    (sum: number, item: { quantity: number, unitPrice: number }) => sum + item.quantity * item.unitPrice,
    0
  )
  this.totalPrice = Math.max(0, this.subtotal - (this.discount || 0))
  this.advancePayment = this.payments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0)
  this.balanceDue = this.totalPrice - this.advancePayment
  return this
}

export type OrderDoc = InferSchemaType<typeof orderSchema> & {
  _id: Types.ObjectId
  recalculateTotals(): OrderDoc
}

export const Order = (models.Order as Model<OrderDoc>) || model<OrderDoc>('Order', orderSchema)
