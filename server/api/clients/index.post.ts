import { z } from 'zod'
import { Client } from '../../models/Client'
import { connectToDatabase } from '../../utils/db'
import { readValidatedBodyOrThrow } from '../../utils/validation'
import { requirePermission } from '../../utils/auth'
import { logActivity } from '../../utils/activity'

export const clientInputSchema = z.object({
  fullName: z.string().trim().min(2, 'FIELD_NAME_MIN').max(120),
  phone: z.string().trim().min(6, 'FIELD_PHONE_INVALID').max(32),
  secondaryPhone: z.string().trim().max(32).default(''),
  telegramId: z.string().trim().max(64).default(''),
  address: z.string().trim().max(400).default(''),
  notes: z.string().trim().max(2000).default(''),
  tags: z.array(z.string().trim().max(32)).max(12).default([])
})

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'clients:create')
  const input = await readValidatedBodyOrThrow(event, clientInputSchema)

  await connectToDatabase()

  const duplicate = await Client.findOne({ phone: input.phone, isArchived: false }).lean()
  if (duplicate) {
    throw apiError('VALIDATION_FAILED', 409, {
      data: {
        errors: [{
          name: 'phone',
          message: 'FIELD_PHONE_TAKEN',
          params: { name: duplicate.fullName }
        }]
      }
    })
  }

  const client = await Client.create({ ...input, createdBy: user.id })

  logActivity(event, user, {
    action: 'client.create',
    entity: 'Client',
    entityId: String(client._id),
    summary: `Created client ${client.fullName}`
  })

  return client.toObject()
})
