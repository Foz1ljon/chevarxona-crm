import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
const { Schema, model, models } = mongoose

/** Audit trail surfaced to SUPER_ADMIN under Settings → Activity. dd */ 
const activityLogSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: '' },
    summary: { type: String, default: '' },
    meta: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: '' }
  },
  { timestamps: true, collection: 'activity_logs' }
)

activityLogSchema.index({ createdAt: -1 })

export type ActivityLogDoc = InferSchemaType<typeof activityLogSchema> & { _id: Types.ObjectId }

export const ActivityLog =
  (models.ActivityLog as Model<ActivityLogDoc>)
  || model<ActivityLogDoc>('ActivityLog', activityLogSchema)
