import { z } from 'zod'
import { User } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { readValidatedBodyOrThrow } from '../../utils/validation'
import { getCurrentUser, resolvePermissions, setAuthSession } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('FIELD_EMAIL_INVALID'),
  password: z.string().min(1, 'FIELD_PASSWORD_REQUIRED')
})

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBodyOrThrow(event, loginSchema)

  await connectToDatabase()

  const user = await User.findOne({ email })
    .select('+passwordHash')
    .populate<{ role: { key: string, name: string, permissions: string[] } }>('role', 'key name permissions')

  // Identical response for unknown email and wrong password — no user enumeration.
  const invalid = () => apiError('INVALID_CREDENTIALS', 401)

  if (!user) throw invalid()
  if (!(await user.verifyPassword(password))) throw invalid()

  if (!user.isActive) {
    throw apiError('ACCOUNT_DEACTIVATED', 403)
  }

  user.lastLoginAt = new Date()
  await user.save()

  await setAuthSession(event, String(user._id))
  // Clear the per-request cache so `getCurrentUser` re-reads the new session.
  event.context.authUser = undefined

  const role = user.role as unknown as { name: string, permissions: string[] } | null
  const sessionUser = await getCurrentUser(event)

  logActivity(event, sessionUser, {
    action: 'auth.login',
    entity: 'User',
    entityId: String(user._id),
    summary: `${user.fullName} signed in`
  })

  return {
    user: sessionUser ?? {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      roleKey: user.roleKey,
      roleName: role?.name ?? user.roleKey,
      permissions: resolvePermissions(user.roleKey, role?.permissions ?? [], user.extraPermissions, user.revokedPermissions)
    }
  }
})
