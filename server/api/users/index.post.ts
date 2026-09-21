import { User, hashPassword } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { readValidatedBodyOrThrow, z } from '../../utils/validation'
import { getRoleByKey, requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { ALL_PERMISSIONS, ROLE_KEYS } from '../../../shared/utils/permissions'

export const userInputSchema = z.object({
  fullName: z.string().trim().min(2, 'FIELD_NAME_MIN').max(120),
  email: z.string().trim().toLowerCase().email('FIELD_EMAIL_INVALID'),
  phone: z.string().trim().max(32).default(''),
  password: z.string().min(8, 'FIELD_PASSWORD_MIN').max(128),
  roleKey: z.enum(ROLE_KEYS),
  specialties: z.array(z.string().trim().max(40)).max(12).default([]),
  extraPermissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]),
  revokedPermissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).default([]),
  isActive: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'users:manage')
  const input = await readValidatedBodyOrThrow(event, userInputSchema)

  await connectToDatabase()

  if (await User.findOne({ email: input.email }).lean()) {
    throw apiError('VALIDATION_FAILED', 409, {
      data: { errors: [{ name: 'email', message: 'FIELD_EMAIL_TAKEN' }] }
    })
  }

  // Only a SUPER_ADMIN may mint another SUPER_ADMIN.
  if (input.roleKey === 'SUPER_ADMIN' && actor.roleKey !== 'SUPER_ADMIN') {
    throw apiError('SUPER_ADMIN_CREATE', 403)
  }

  const role = await getRoleByKey(input.roleKey)

  const { password, ...rest } = input
  const user = await User.create({
    ...rest,
    role: role._id,
    passwordHash: await hashPassword(password)
  })

  logActivity(event, actor, {
    action: 'user.create',
    entity: 'User',
    entityId: String(user._id),
    summary: `Created ${input.roleKey} account for ${user.fullName}`
  })

  const created = user.toObject()
  delete (created as Record<string, unknown>).passwordHash
  return created
})
