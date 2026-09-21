import { z } from 'zod'
import { User, hashPassword } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { readValidatedBodyOrThrow } from '../../utils/validation'
import { requireAuth } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

const schema = z.object({
  currentPassword: z.string().min(1, 'FIELD_CURRENT_PASSWORD_REQUIRED'),
  newPassword: z.string().min(8, 'FIELD_PASSWORD_MIN'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'FIELD_PASSWORDS_MISMATCH',
  path: ['confirmPassword']
})

export default defineEventHandler(async (event) => {
  const sessionUser = await requireAuth(event)
  const { currentPassword, newPassword } = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()
  const user = await User.findById(sessionUser.id).select('+passwordHash')
  if (!user) throw apiError('USER_NOT_FOUND', 404)

  if (!(await user.verifyPassword(currentPassword))) {
    throw apiError('VALIDATION_FAILED', 422, {
      data: { errors: [{ name: 'currentPassword', message: 'FIELD_CURRENT_PASSWORD_WRONG' }] }
    })
  }

  user.passwordHash = await hashPassword(newPassword)
  await user.save()

  logActivity(event, sessionUser, {
    action: 'auth.password_change',
    entity: 'User',
    entityId: sessionUser.id,
    summary: `${sessionUser.fullName} changed their password`
  })

  return { ok: true }
})
