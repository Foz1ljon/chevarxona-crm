import mongoose from 'mongoose'
import type { Model, ClientSession } from 'mongoose'
const { Schema, model, models } = mongoose

/** Atomic sequence generator backing human-readable order numbers. */
const counterSchema = new Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { collection: 'counters', versionKey: false }
)

type CounterDoc = { _id: string, seq: number }

export const Counter = (models.Counter as Model<CounterDoc>) || model<CounterDoc>('Counter', counterSchema)

/** `ORD-2026-0007` style identifiers, unique per year via findOneAndUpdate($inc). */
export async function nextOrderNumber(session?: ClientSession) {
  const year = new Date().getFullYear()
  const doc = await Counter.findOneAndUpdate(
    { _id: `order:${year}` },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, session }
  ).lean()

  return `ORD-${year}-${String(doc!.seq).padStart(4, '0')}`
}
