import { User, hashPassword } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../utils/validation'
import { getRoleByKey, requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { userInputSchema } from './index.post'

const patchSchema = userInputSchema.partial().extend({
  password: z.string().min(8, 'FIELD_PASSWORD_MIN').max(128).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users:manage')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, patchSchema)

  await connectToDatabase()

  const user = await User.findById(id)
  if (!user) throw apiError('USER_NOT_FOUND', 404)

  const editingSelf = String(user._id) === actor.id

  if (user.roleKey === 'SUPER_ADMIN' && actor.roleKey !== 'SUPER_ADMIN') {
    throw apiError('SUPER_ADMIN_EDIT', 403)
  }
  if (input.roleKey === 'SUPER_ADMIN' && actor.roleKey !== 'SUPER_ADMIN') {
    throw apiError('SUPER_ADMIN_GRANT', 403)
  }
  // Guard against an admin locking themselves out mid-session.
  if (editingSelf && (input.isActive === false || (input.roleKey && input.roleKey !== user.roleKey))) {
    throw apiError('SELF_ROLE_CHANGE', 409)
  }

  if (input.email && input.email !== user.email) {
    if (await User.findOne({ email: input.email, _id: { $ne: id } }).lean()) {
      throw apiError('VALIDATION_FAILED', 409, {
        data: { errors: [{ name: 'email', message: 'FIELD_EMAIL_TAKEN' }] }
      })
    }
  }

  if (input.roleKey && input.roleKey !== user.roleKey) {
    const role = await getRoleByKey(input.roleKey)
    user.role = role._id as never
    user.roleKey = input.roleKey
  }

  if (input.password) user.passwordHash = await hashPassword(input.password)
  if (input.fullName !== undefined) user.fullName = input.fullName
  if (input.email !== undefined) user.email = input.email
  if (input.phone !== undefined) user.phone = input.phone
  if (input.specialties !== undefined) user.specialties = input.specialties
  if (input.extraPermissions !== undefined) user.extraPermissions = input.extraPermissions
  if (input.revokedPermissions !== undefined) user.revokedPermissions = input.revokedPermissions
  if (input.isActive !== undefined) user.isActive = input.isActive

  await user.save()

  logActivity(event, actor, {
    action: 'user.update',
    entity: 'User',
    entityId: id,
    summary: `Updated account ${user.fullName}`,
    meta: { fields: Object.keys(input).filter(key => key !== 'password') }
  })

  const updated = user.toObject()
  delete (updated as Record<string, unknown>).passwordHash
  return updated
})
