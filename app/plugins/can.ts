import type { Permission } from '#shared/utils/permissions'

/**
 * `$can(permission)` — template-side permission check.
 *
 *   <UButton v-if="$can('orders:create')">New order</UButton>
 *   <UButton v-if="$can(['orders:update', 'orders:assign'])">Assign</UButton>
 *
 * This used to be a `v-can` directive. Vue only forwards a directive to a
 * component's root *element*, so `v-can` on `<UButton to="…">` (rooted at a
 * NuxtLink) was skipped with a runtime warning and left the control visible to
 * users who could not use it. A conditional render has no such blind spot and
 * also keeps hidden controls out of the DOM.
 *
 * This is a UX guard only — every route enforces the same permission
 * server-side, so hiding a control never stands in for authorisation.
 */
export default defineNuxtPlugin(() => ({
  provide: {
    can: (permission: Permission | Permission[]) => useAuthStore().can(permission)
  }
}))
