import { Fabric } from '../../../models/Fabric'
import { connectToDatabase } from '../../../utils/db'
import { listInventory } from '../../../utils/inventory'
import { requirePermission } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'inventory:read')
  await connectToDatabase()
  return listInventory(event, Fabric, 'fabricType')
})
