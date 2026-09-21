import type { Permission, RoleKey } from '#shared/utils/permissions'

export interface StaffUser {
  _id: string
  fullName: string
  email: string
  phone: string
  roleKey: RoleKey
  role: { _id: string, key: string, name: string, permissions: Permission[] } | string
  extraPermissions: Permission[]
  revokedPermissions: Permission[]
  specialties: string[]
  avatarUrl: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface StaffRole {
  _id: string
  key: RoleKey
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  userCount: number
  activeUserCount: number
  meta: { label: string, description: string, color: string, icon: string }
}

export function useStaff() {
  const toast = useApiToast()
  const { t } = useI18n()

  function users(query: MaybeRefOrGetter<Record<string, unknown>>) {
    return useFetch<{ items: StaffUser[], total: number, page: number, pages: number }>('/api/users', {
      query: computed(() => toValue(query)),
      default: () => ({ items: [], total: 0, page: 1, pages: 1 })
    })
  }

  function roles() {
    return useFetch<{ items: StaffRole[], groups: Record<string, { label: string, permissions: Record<string, string> }> }>(
      '/api/roles',
      { default: () => ({ items: [], groups: {} }) }
    )
  }

  function tailors() {
    return useFetch<{ items: Array<StaffUser & { activeGarments: number, activeOrders: number }> }>(
      '/api/users/tailors',
      { default: () => ({ items: [] }) }
    )
  }

  async function createUser(body: Record<string, unknown>) {
    const user = await $fetch<StaffUser>('/api/users', { method: 'POST', body })
    toast.success(t('staff.added'), user.fullName)
    return user
  }

  async function updateUser(id: string, body: Record<string, unknown>) {
    const user = await $fetch<StaffUser>(`/api/users/${id}`, { method: 'PATCH', body })
    toast.success(t('staff.updated'), user.fullName)
    return user
  }

  async function deactivateUser(id: string) {
    const result = await $fetch<{ openWork: number }>(`/api/users/${id}`, { method: 'DELETE' })
    toast.success(
      t('staff.accountDeactivated'),
      result.openWork ? t('staff.openWork', { n: result.openWork }) : undefined
    )
    return result
  }

  async function updateRole(id: string, body: { permissions?: Permission[], name?: string, description?: string }) {
    const role = await $fetch<StaffRole>(`/api/roles/${id}`, { method: 'PATCH', body })
    toast.success(t('roles.updated'), role.name)
    return role
  }

  return { users, roles, tailors, createUser, updateUser, deactivateUser, updateRole }
}
