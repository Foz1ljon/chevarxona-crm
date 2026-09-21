import type { H3Event } from 'h3'
import { User } from '../models/User'
import { Role } from '../models/Role'
import { connectToDatabase } from './db'
import { ALL_PERMISSIONS, type Permission, type RoleKey } from '../../shared/utils/permissions'

export interface SessionUser {
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

const SESSION_NAME = 'chevarxona-session'

function sessionConfig() {
  const { sessionPassword } = useRuntimeConfig()
  if (sessionPassword.length < 32) {
    throw new Error('NUXT_SESSION_PASSWORD must be at least 32 characters long')
  }
  return {
    name: SESSION_NAME,
    password: sessionPassword,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    }
  }
}

export async function getAuthSession(event: H3Event) {
  return useSession<{ userId?: string }>(event, sessionConfig())
}

export async function setAuthSession(event: H3Event, userId: string) {
  const session = await getAuthSession(event)
  await session.update({ userId })
}

export async function clearAuthSession(event: H3Event) {
  const session = await getAuthSession(event)
  await session.clear()
}

/**
 * Effective permissions = role grant + per-user extras − per-user revocations.
 * SUPER_ADMIN always resolves to the complete catalogue so a mis-seeded role
 * document can never lock the owner out of their own system.
 */
export function resolvePermissions(
  roleKey: string,
  rolePermissions: string[],
  extra: string[] = [],
  revoked: string[] = []
): Permission[] {
  if (roleKey === 'SUPER_ADMIN') return [...ALL_PERMISSIONS]

  const granted = new Set([...rolePermissions, ...extra])
  for (const permission of revoked) granted.delete(permission)

  return [...granted].filter(p => (ALL_PERMISSIONS as string[]).includes(p)) as Permission[]
}

/** Loads (and memoises per request) the signed-in user. Returns null when anonymous. */
export async function getCurrentUser(event: H3Event): Promise<SessionUser | null> {
  if (event.context.authUser !== undefined) {
    return event.context.authUser as SessionUser | null
  }

  const session = await getAuthSession(event)
  const userId = session.data?.userId

  if (!userId) {
    event.context.authUser = null
    return null
  }

  await connectToDatabase()
  const user = await User.findById(userId)
    .populate<{ role: { key: string, name: string, permissions: string[] } }>('role', 'key name permissions')
    .lean()

  if (!user || !user.isActive) {
    event.context.authUser = null
    return null
  }

  const role = user.role as unknown as { key: string, name: string, permissions: string[] } | null

  const sessionUser: SessionUser = {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? '',
    avatarUrl: user.avatarUrl ?? '',
    roleKey: user.roleKey as RoleKey,
    roleName: role?.name ?? user.roleKey,
    permissions: resolvePermissions(
      user.roleKey,
      role?.permissions ?? [],
      user.extraPermissions ?? [],
      user.revokedPermissions ?? []
    ),
    specialties: user.specialties ?? [],
    isActive: user.isActive ?? true
  }

  event.context.authUser = sessionUser
  return sessionUser
}

export async function requireAuth(event: H3Event): Promise<SessionUser> {
  const user = await getCurrentUser(event)
  if (!user) {
    throw apiError('AUTH_REQUIRED', 401)
  }
  return user
}

export function hasPermission(user: SessionUser, permission: Permission | Permission[]): boolean {
  const wanted = Array.isArray(permission) ? permission : [permission]
  return wanted.some(p => user.permissions.includes(p))
}

/** Throws 403 unless the user holds at least one of the listed permissions. */
export async function requirePermission(
  event: H3Event,
  permission: Permission | Permission[]
): Promise<SessionUser> {
  const user = await requireAuth(event)
  if (!hasPermission(user, permission)) {
    throw apiError('PERMISSION_DENIED', 403, {
      params: { permission: Array.isArray(permission) ? permission.join(' or ') : permission }
    })
  }
  return user
}

/** Ensures the seeded role documents exist and returns the one requested. */
export async function getRoleByKey(key: RoleKey) {
  await connectToDatabase()
  const role = await Role.findOne({ key })
  if (!role) throw apiError('ROLE_NOT_PROVISIONED', 500, { params: { role: key } })
  return role
}
