import { Client } from '../../../models/Client'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow, getValidatedQueryOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import type { ClientDoc } from '../../../models/Client'

type MeasurementProfile = ClientDoc['measurements'][number]

const querySchema = z.object({
  activeOnly: z.enum(['true', 'false']).default('true')
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, ['clients:read', 'clients:measurements'])
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const { activeOnly } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const client = await Client.findById(id).select('fullName measurements').lean()
  if (!client) throw apiError('CLIENT_NOT_FOUND', 404)

  const profiles = ((client.measurements ?? []) as MeasurementProfile[])
    .filter((profile: MeasurementProfile) => activeOnly === 'false' || profile.isActive)
    .sort(
      (a: MeasurementProfile, b: MeasurementProfile) =>
        Number(new Date(b.takenAt ?? 0)) - Number(new Date(a.takenAt ?? 0))
    )

  return { clientName: client.fullName, profiles }
})
