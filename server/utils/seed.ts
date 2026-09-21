import { Accessory } from '../models/Accessory'
import { ActivityLog } from '../models/ActivityLog'
import { Client } from '../models/Client'
import { Counter } from '../models/Counter'
import { Fabric } from '../models/Fabric'
import { GarmentCategory } from '../models/GarmentCategory'
import { Order } from '../models/Order'
import { Role } from '../models/Role'
import { StockMovement } from '../models/StockMovement'
import { User, hashPassword } from '../models/User'
import {
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_KEYS,
  ROLE_META,
  type RoleKey
} from '../../shared/utils/permissions'
import { ACCESSORY_SEED, FABRIC_SEED, GARMENT_CATEGORY_SEED } from './seedData'
import { seedDemoWorkshop } from './seedDemo'
import { connectToDatabase } from './db'

export interface SeedOptions {
  /** Wipe business collections (keeping roles and the super admin) first. */
  reset?: boolean
  adminEmail?: string
  adminPassword?: string
}

export interface SeedResult {
  reset: boolean
  categories: number
}

/**
 * Idempotent bootstrap. Roles are always reconciled (so a new permission added
 * to the catalogue reaches existing installs), while business data is only
 * created when its collection is still empty — unless `reset` was requested.
 */
export async function runSeed(options: SeedOptions = {}): Promise<SeedResult> {
  await connectToDatabase()

  if (options.reset) {
    await resetBusinessData()
  }

  const roleIds = await seedRoles()
  await seedSuperAdmin(
    roleIds.SUPER_ADMIN,
    options.adminEmail ?? useRuntimeConfig().seedAdminEmail,
    options.adminPassword ?? useRuntimeConfig().seedAdminPassword
  )

  const materials = await seedInventory()
  const categories = await seedGarmentCategories(materials)
  await seedDemoWorkshop(roleIds)

  return { reset: Boolean(options.reset), categories }
}

/**
 * Clears everything a workshop generates, but never the roles or the super
 * admin — wiping those would lock the owner out of their own system.
 */
async function resetBusinessData() {
  await Promise.all([
    ActivityLog.deleteMany({}),
    Order.deleteMany({}),
    Client.deleteMany({}),
    StockMovement.deleteMany({}),
    GarmentCategory.deleteMany({}),
    Fabric.deleteMany({}),
    Accessory.deleteMany({}),
    Counter.deleteMany({})
  ])

  // Demo and real staff alike are recreated by the demo seeder.
  await User.deleteMany({ roleKey: { $ne: 'SUPER_ADMIN' } })

  console.info('[chevarxona] Business data cleared — re-seeding from scratch.')
}

async function seedRoles() {
  const ids = {} as Record<RoleKey, string>

  for (const key of ROLE_KEYS) {
    const meta = ROLE_META[key]
    const existing = await Role.findOne({ key })

    if (!existing) {
      const created = await Role.create({
        key,
        name: meta.label,
        description: meta.description,
        permissions: DEFAULT_ROLE_PERMISSIONS[key],
        isSystem: true
      })
      ids[key] = String(created._id)
      continue
    }

    // SUPER_ADMIN must always hold the full catalogue, even after an upgrade
    // introduces new permission keys.
    if (key === 'SUPER_ADMIN') {
      existing.permissions = DEFAULT_ROLE_PERMISSIONS.SUPER_ADMIN
      await existing.save()
    }
    ids[key] = String(existing._id)
  }

  return ids
}

async function seedSuperAdmin(roleId: string, email: string, password: string) {
  if (await User.countDocuments()) return

  await User.create({
    fullName: 'Tizim administratori',
    email,
    phone: '+998 90 000 00 00',
    passwordHash: await hashPassword(password),
    roleKey: 'SUPER_ADMIN',
    role: roleId,
    isActive: true
  })

  console.info(
    `\n[chevarxona] Seeded super admin → ${email} / ${password}`
    + '\n[chevarxona] Change this password immediately in Settings → Staff.\n'
  )
}

async function seedInventory() {
  if (!(await Fabric.countDocuments())) {
    await Fabric.insertMany(FABRIC_SEED.map(f => ({ ...f, unit: 'm' })))
  }
  if (!(await Accessory.countDocuments())) {
    await Accessory.insertMany(ACCESSORY_SEED)
  }

  const fabrics = await Fabric.find().select('_id fabricType sku unit').lean()
  const accessories = await Accessory.find().select('_id category sku unit').lean()

  const fabricsByType = new Map<string, { id: string, unit: string }>()
  for (const fabric of fabrics) {
    if (!fabricsByType.has(fabric.fabricType)) {
      fabricsByType.set(fabric.fabricType, { id: String(fabric._id), unit: fabric.unit })
    }
  }

  const accessoriesByCategory = new Map<string, { id: string, unit: string }>()
  for (const accessory of accessories) {
    if (!accessoriesByCategory.has(accessory.category)) {
      accessoriesByCategory.set(accessory.category, { id: String(accessory._id), unit: accessory.unit })
    }
  }

  return { fabricsByType, accessoriesByCategory }
}

async function seedGarmentCategories(materials: Awaited<ReturnType<typeof seedInventory>>) {
  if (await GarmentCategory.countDocuments()) return 0

  const docs = GARMENT_CATEGORY_SEED.map(category => ({
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    basePrice: category.basePrice,
    estimatedDays: category.estimatedDays,
    sortOrder: category.sortOrder,
    measurementFields: category.measurementFields,
    bomTemplate: category.bom
      .map((line) => {
        const resolved = line.type === 'FABRIC'
          ? materials.fabricsByType.get(line.match)
          : materials.accessoriesByCategory.get(line.match)

        return {
          materialType: line.type,
          material: resolved?.id ?? null,
          materialModel: line.type === 'FABRIC' ? 'Fabric' : 'Accessory',
          accessoryCategory: line.type === 'ACCESSORY' ? line.match : '',
          label: line.label,
          quantity: line.quantity,
          unit: line.unit,
          wastagePercent: 'wastage' in line ? line.wastage : 0,
          optional: false
        }
      })
      // A BOM line without a resolvable material would silently allocate nothing.
      .filter(line => line.material)
  }))

  await GarmentCategory.insertMany(docs)
  console.info(`[chevarxona] Seeded ${docs.length} garment categories with BOM templates.`)
  return docs.length
}
