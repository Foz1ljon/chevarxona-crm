import { z } from 'zod'
import { Client } from '../../models/Client'
import { connectToDatabase } from '../../utils/db'
import { buildSort, escapeRegex, getValidatedQueryOrThrow, paginationSchema } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'

const querySchema = paginationSchema.extend({
  archived: z.enum(['true', 'false', 'all']).default('false'),
  hasDebt: z.enum(['true', 'false']).optional()
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'clients:read')
  const { page, limit, search, sort, dir, archived, hasDebt } = getValidatedQueryOrThrow(event, querySchema)

  await connectToDatabase()

  const filter: Record<string, unknown> = {}
  if (archived !== 'all') filter.isArchived = archived === 'true'
  if (hasDebt === 'true') filter.debtBalance = { $gt: 0 }

  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ fullName: rx }, { phone: rx }, { secondaryPhone: rx }, { telegramId: rx }]
  }

  const [items, total] = await Promise.all([
    Client.find(filter)
      .sort(buildSort(sort, dir))
      .skip((page - 1) * limit)
      .limit(limit)
      // The measurement history can be large; the list view only needs the count.
      .select('-measurements.values -measurements.notes')
      .lean(),
    Client.countDocuments(filter)
  ])

  return {
    items: items.map(client => ({
      ...client,
      measurementProfiles: client.measurements?.length ?? 0,
      measurements: undefined
    })),
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit))
  }
})
