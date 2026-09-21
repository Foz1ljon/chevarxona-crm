import { Client } from '../../../models/Client'
import { Order } from '../../../models/Order'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

/**
 * Clients with order history are archived rather than deleted so financial
 * reports and stock movements keep a resolvable owner.
 */
export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'clients:delete')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()

  const client = await Client.findById(id)
  if (!client) throw apiError('CLIENT_NOT_FOUND', 404)

  const orderCount = await Order.countDocuments({ client: id })

  if (orderCount > 0) {
    client.isArchived = true
    await client.save()

    logActivity(event, user, {
      action: 'client.archive',
      entity: 'Client',
      entityId: id,
      summary: `Archived ${client.fullName} (${orderCount} orders on file)`
    })

    return { deleted: false, archived: true, orderCount }
  }

  await client.deleteOne()

  logActivity(event, user, {
    action: 'client.delete',
    entity: 'Client',
    entityId: id,
    summary: `Deleted client ${client.fullName}`
  })

  return { deleted: true, archived: false }
})
