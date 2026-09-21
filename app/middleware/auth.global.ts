import type { Permission } from '#shared/utils/permissions'

const PUBLIC_ROUTES = new Set(['/login'])

/**
 * Global gate. Pages declare what they need via `definePageMeta`:
 *
 *   definePageMeta({ permission: 'orders:read' })
 *   definePageMeta({ layout: 'auth', public: true })
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()

  // Resolve the session once — on the server during SSR, then reused on the client.
  if (!auth.ready) await auth.fetchSession()

  const isPublic = to.meta.public === true || PUBLIC_ROUTES.has(to.path)

  if (!auth.isAuthenticated) {
    if (isPublic) return
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined })
  }

  // Signed-in users have no reason to sit on the login screen.
  if (to.path === '/login') {
    return navigateTo(landingRouteFor(auth.user!.roleKey))
  }

  const required = to.meta.permission as Permission | Permission[] | undefined
  if (required && !auth.can(required)) {
    // The body comes from error.vue so the copy follows the active locale.
    throw createError({ statusCode: 403, fatal: false })
  }
})

/** Tailors start on their own work queue rather than the manager dashboard. */
function landingRouteFor(roleKey: string) {
  if (roleKey === 'TAILOR') return '/orders'
  if (roleKey === 'INVENTORY_CLERK') return '/inventory'
  return '/'
}
