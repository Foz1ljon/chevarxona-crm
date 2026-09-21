import { GarmentCategory } from '../../../models/GarmentCategory'
import { Order } from '../../../models/Order'
import { connectToDatabase } from '../../../utils/db'
import { objectId, parseOrThrow } from '../../../utils/validation'
import { requirePermission } from '../../../utils/auth'
import { logActivity } from '../../../utils/activity'

export default defineEventHandler(async (event) => {
  const user = await requirePermission(event, 'catalog:manage')
  const id = parseOrThrow(objectId, getRouterParam(event, 'id'))

  await connectToDatabase()

  const category = await GarmentCategory.findById(id)
  if (!category) throw apiError('GARMENT_TYPE_NOT_FOUND', 404)

  const inUse = await Order.countDocuments({ 'items.garmentCategory': id })

  if (inUse > 0) {
    category.isActive = false
    await category.save()

    logActivity(event, user, {
      action: 'catalog.deactivate',
      entity: 'GarmentCategory',
      entityId: id,
      summary: `Deactivated ${category.name} (used by ${inUse} orders)`
    })

    return { deleted: false, deactivated: true, inUse }
  }

  await category.deleteOne()

  logActivity(event, user, {
    action: 'catalog.delete',
    entity: 'GarmentCategory',
    entityId: id,
    summary: `Deleted garment type ${category.name}`
  })

  return { deleted: true, deactivated: false }
})
