import { clearAuthSession, getCurrentUser } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event)

  if (user) {
    logActivity(event, user, {
      action: 'auth.logout',
      entity: 'User',
      entityId: user.id,
      summary: `${user.fullName} signed out`
    })
  }

  await clearAuthSession(event)
  event.context.authUser = null

  return { ok: true }
})
