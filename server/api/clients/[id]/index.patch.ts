import { Client } from '../../../models/Client'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'
import { clientInputSchema } from '../index.post'

const patchSchema = clientInputSchema.partial().extend({
  isArchived: z.boolean().optional()
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'clients:update')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, patchSchema)

  await connectToDatabase()

  const client = await Client.findByIdAndUpdate(id, { $set: input }, { returnDocument: 'after', runValidators: true }).lean()
  if (!client) throw apiError('CLIENT_NOT_FOUND', 404)

  logActivity(event, user, {
    action: 'client.update',
    entity: 'Client',
    entityId: id,
    summary: `Updated client ${client.fullName}`,
    meta: { fields: Object.keys(input) }
  })

  return client
})
