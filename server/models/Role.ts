import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
import { ALL_PERMISSIONS, ROLE_KEYS } from '../../shared/utils/permissions'
const { Schema, model, models } = mongoose

const roleSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      enum: ROLE_KEYS
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    permissions: {
      type: [{ type: String, enum: ALL_PERMISSIONS }],
      default: []
    },
    /** System roles cannot be deleted; SUPER_ADMIN additionally cannot be edited. */
    isSystem: { type: Boolean, default: true }
  },
  { timestamps: true, collection: 'roles' }
)

export type RoleDoc = InferSchemaType<typeof roleSchema> & { _id: Types.ObjectId }

export const Role = (models.Role as Model<RoleDoc>) || model<RoleDoc>('Role', roleSchema)
