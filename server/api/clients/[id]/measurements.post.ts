import { Client } from '../../../models/Client'
import { GarmentCategory } from '../../../models/GarmentCategory'
import { connectToDatabase } from '../../../utils/db'
import { objectId, optionalObjectId, parseOrThrow, readValidatedBodyOrThrow, z } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import type { ClientDoc } from '../../../models/Client'

type MeasurementProfile = ClientDoc['measurements'][number]
import { logActivity } from '../../../utils/activity'

const schema = z.object({
  name: z.string().trim().min(1, 'FIELD_PROFILE_NAME').max(80),
  garmentCategory: optionalObjectId,
  notes: z.string().trim().max(1000).default(''),
  values: z.array(z.object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    value: z.coerce.number().min(0).max(400),
    unit: z.string().trim().max(8).default('cm')
  })).min(1, 'FIELD_MEASUREMENTS_REQUIRED')
})

/**
 * Adds a measurement profile. Re-submitting the same profile name supersedes
 * the previous revision instead of overwriting it, so historical orders keep
 * the numbers they were actually cut to.
 */
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'clients:measurements')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))
  const input = await readValidatedBodyOrThrow(event, schema)

  await connectToDatabase()

  const client = await Client.findById(id)
  if (!client) throw apiError('CLIENT_NOT_FOUND', 404)

  let categoryName = ''
  if (input.garmentCategory) {
    const category = await GarmentCategory.findById(input.garmentCategory).select('name').lean()
    if (!category) throw apiError('UNKNOWN_GARMENT_CATEGORY', 422)
    categoryName = category.name
  }

  const sameName = (profile: MeasurementProfile) =>
    profile.name.toLowerCase() === input.name.toLowerCase()

  const profiles = client.measurements as unknown as MeasurementProfile[]

  // Supersede the current revision rather than overwriting it.
  for (const stale of profiles.filter(p => sameName(p) && p.isActive)) {
    stale.isActive = false
  }

  const version = profiles
    .filter(sameName)
    .reduce((max: number, profile: MeasurementProfile) => Math.max(max, profile.version ?? 1), 0) + 1

  client.measurements.push({
    name: input.name,
    garmentCategory: input.garmentCategory ?? null,
    garmentCategoryName: categoryName,
    version,
    isActive: true,
    values: input.values,
    notes: input.notes,
    takenBy: user.id,
    takenAt: new Date()
  } as never)

  await client.save()

  logActivity(event, user, {
    action: 'client.measurement_add',
    entity: 'Client',
    entityId: id,
    summary: `Recorded "${input.name}" v${version} for ${client.fullName}`,
    meta: { version, fields: input.values.length }
  })

  return client.toObject()
})
