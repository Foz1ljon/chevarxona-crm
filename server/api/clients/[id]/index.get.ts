import { Client } from '../../../models/Client'
import { Order } from '../../../models/Order'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'clients:read')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()

  const [client, orders] = await Promise.all([
    Client.findById(id).lean(),
    Order.find({ client: id })
      .sort({ createdAt: -1 })
      .limit(25)
      .select('orderNumber status orderDate deadline totalPrice balanceDue items.garmentName')
      .lean()
  ])

  if (!client) throw apiError('CLIENT_NOT_FOUND', 404)

  return { client, orders }
})
