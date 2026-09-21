import { Role } from '../../models/Role'
import { connectToDatabase } from '../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'
import { ALL_PERMISSIONS, type Permission } from '../../../shared/utils/permissions'

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  permissions: z.array(z.enum(ALL_PERMISSIONS as [string, ...string[]])).optional()
})

export default defineEventHandler(async (event) => {
  const actor = await requirePermission(event, 'roles:manage')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const role = await Role.findById(id)
  if (!role) throw apiError('ROLE_NOT_FOUND', 404)

  // SUPER_ADMIN's grant is computed, not stored — editing it would be a no-op
  // that misleads the operator, so reject it outright.
  if (role.key === 'SUPER_ADMIN' && input.permissions) {
    throw apiError('SUPER_ADMIN_LOCKED', 409)
  }

  const before: string[] = [...role.permissions]

  if (input.name !== undefined) role.name = input.name
  if (input.description !== undefined) role.description = input.description
  if (input.permissions !== undefined) role.permissions = input.permissions as Permission[]

  await role.save()

  const next: string[] = input.permissions ?? before
  const added = next.filter(permission => !before.includes(permission))
  const removed = before.filter(permission => !next.includes(permission))

  logActivity(event, actor, {
    action: 'role.update',
    entity: 'Role',
    entityId: id,
    summary: `Updated role ${role.name}${
      input.permissions ? ` (+${added.length} / −${removed.length} permissions)` : ''
    }`,
    meta: { added, removed }
  })

  return role.toObject()
})
