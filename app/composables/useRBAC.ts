import type { Permission } from '#shared/utils/permissions'

/**
 * Thin, component-friendly wrapper over the auth store.
 *
 * ```vue
 * <UButton v-if="can('orders:create')" />
 * <UButton v-can="'orders:create'" />
 * ```
 */
export function useRBAC() {
  const auth = useAuthStore()

  return {
    user: computed(() => auth.user),
    role: computed(() => auth.user?.roleKey ?? null),
    permissions: computed(() => auth.user?.permissions ?? []),
    can: (permission: Permission | Permission[]) => auth.can(permission),
    canAll: (permissions: Permission[]) => auth.canAll(permissions),
    cannot: (permission: Permission | Permission[]) => !auth.can(permission),
    isRole: (...roles: string[]) => Boolean(auth.user && roles.includes(auth.user.roleKey)),
    isSuperAdmin: computed(() => auth.user?.roleKey === 'SUPER_ADMIN'),
    isTailor: computed(() => auth.user?.roleKey === 'TAILOR')
  }
}

export const useAuth = () => useAuthStore()
