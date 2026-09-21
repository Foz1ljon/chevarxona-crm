import { getCurrentUser } from '../../utils/auth'

/** Returns the session user, or `null` for anonymous visitors (never a 401). */
export default defineEventHandler(async (event) => {
  return { user: await getCurrentUser(event) }
})
