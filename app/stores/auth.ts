import { defineStore } from 'pinia'
import type { Permission, RoleKey } from '#shared/utils/permissions'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  phone: string
  avatarUrl: string
  roleKey: RoleKey
  roleName: string
  permissions: Permission[]
  specialties: string[]
  isActive: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const user = shallowRef<AuthUser | null>(null)
  const ready = ref(false)

  const isAuthenticated = computed(() => Boolean(user.value))
  const permissions = computed(() => new Set(user.value?.permissions ?? []))

  /**
   * Resolves the session once per app boot; safe to call repeatedly.
   *
   * Uses `useRequestFetch` so the incoming cookie header is forwarded during
   * SSR — a plain `$fetch` runs without it and every page would render as
   * anonymous before hydration.
   */
  async function fetchSession(force = false) {
    if (ready.value && !force) return user.value

    try {
      const request = import.meta.server ? useRequestFetch() : $fetch
      const { user: sessionUser } = await request<{ user: AuthUser | null }>('/api/auth/me')
      user.value = sessionUser
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }

    return user.value
  }

  async function login(credentials: { email: string, password: string }) {
    const { user: sessionUser } = await $fetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: credentials
    })
    user.value = sessionUser
    ready.value = true
    return sessionUser
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    ready.value = true
    await navigateTo('/login')
  }

  function can(permission: Permission | Permission[]) {
    if (!user.value) return false
    const wanted = Array.isArray(permission) ? permission : [permission]
    return wanted.some(p => permissions.value.has(p))
  }

  function canAll(required: Permission[]) {
    return required.every(p => permissions.value.has(p))
  }

  return { user, ready, isAuthenticated, permissions, fetchSession, login, logout, can, canAll }
})
