import { Accessory } from '../../models/Accessory'
import { ActivityLog } from '../../models/ActivityLog'
import { Client } from '../../models/Client'
import { Fabric } from '../../models/Fabric'
import { GarmentCategory } from '../../models/GarmentCategory'
import { Order } from '../../models/Order'
import { StockMovement } from '../../models/StockMovement'
import { User } from '../../models/User'
import { connectToDatabase } from '../../utils/db'
import { getCurrentUser } from '../../utils/auth'
import { runSeed } from '../../utils/seed'

/**
 * Development-only helper that re-runs the seed fixtures, used by
 * `pnpm seed:reset`. The endpoint never exists in a production bundle:
 * `import.meta.dev` is replaced with `false` at build time, so the branch
 * below is the only body that ever ships.
 */
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const body = await readBody<{ reset?: boolean }>(event).catch(() => null)
  const reset = body?.reset === true

  await connectToDatabase()

  // Wiping the workshop is an owner-level action. Before the very first seed
  // there is nobody to ask, so the bootstrap call is allowed through.
  if (await User.countDocuments()) {
    const user = await getCurrentUser(event)
    if (!user) throw apiError('AUTH_REQUIRED', 401)
    if (user.roleKey !== 'SUPER_ADMIN') throw apiError('PERMISSION_DENIED', 403)
  }

  const startedAt = Date.now()
  const result = await runSeed({ reset })

  const [fabrics, accessories, categories, users, clients, orders, movements, logs] = await Promise.all([
    Fabric.countDocuments(),
    Accessory.countDocuments(),
    GarmentCategory.countDocuments(),
    User.countDocuments(),
    Client.countDocuments(),
    Order.countDocuments(),
    StockMovement.countDocuments(),
    ActivityLog.countDocuments()
  ])

  return {
    reset,
    durationMs: Date.now() - startedAt,
    counts: { fabrics, accessories, categories, users, clients, orders, movements, logs },
    seededCategories: result.categories
  }
})
