import mongoose from 'mongoose'
import type { InferSchemaType, Model, Types } from 'mongoose'
import bcrypt from 'bcryptjs'
import { ROLE_KEYS } from '../../shared/utils/permissions'
const { Schema, model, models } = mongoose

const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: { type: String, default: '', trim: true },
    passwordHash: { type: String, required: true, select: false },
    roleKey: { type: String, required: true, enum: ROLE_KEYS, index: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    /** Per-user overrides layered on top of the role's permission set. */
    extraPermissions: { type: [String], default: [] },
    revokedPermissions: { type: [String], default: [] },
    avatarUrl: { type: String, default: '' },
    specialties: { type: [String], default: [] },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null }
  },
  { timestamps: true, collection: 'users' }
)

userSchema.methods.verifyPassword = function (plain: string) {
  return bcrypt.compare(plain, this.passwordHash)
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10)
}

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: Types.ObjectId
  verifyPassword(plain: string): Promise<boolean>
}

export const User = (models.User as Model<UserDoc>) || model<UserDoc>('User', userSchema)
