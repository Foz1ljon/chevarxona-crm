import type { Types } from 'mongoose'
import { Accessory } from '../models/Accessory'
import { Client } from '../models/Client'
import { Fabric } from '../models/Fabric'
import { GarmentCategory } from '../models/GarmentCategory'
import { Order } from '../models/Order'
import { User, hashPassword } from '../models/User'
import { nextOrderNumber } from '../models/Counter'
import { collectAllocations } from './orders'
import { expandBomTemplate, transitionStockPhase } from './stock'
import { stockPhase, type OrderItemStatus, type OrderStatus } from '../../shared/utils/orderStatus'
import type { RoleKey } from '../../shared/utils/permissions'
import type { SessionUser } from './auth'

/** Password every demo staff account shares. */
export const DEMO_STAFF_PASSWORD = 'demo1234'

interface DemoStaff {
  fullName: string
  email: string
  phone: string
  roleKey: RoleKey
  specialties?: string[]
}

const STAFF: DemoStaff[] = [
  { fullName: 'Nodira Yusupova', email: 'nodira@chevarxona.uz', phone: '+998 90 111 22 33', roleKey: 'MANAGER' },
  { fullName: 'Dilshod Rahimov', email: 'dilshod@chevarxona.uz', phone: '+998 90 222 33 44', roleKey: 'TAILOR', specialties: ['Pidjak', 'Kostyum'] },
  { fullName: 'Shahlo Ismoilova', email: 'shahlo@chevarxona.uz', phone: '+998 90 333 44 55', roleKey: 'TAILOR', specialties: ['Kechki ko‘ylak', 'Atlas'] },
  { fullName: 'Baxtiyor Ergashev', email: 'baxtiyor@chevarxona.uz', phone: '+998 90 444 55 66', roleKey: 'TAILOR', specialties: ['Shim', 'Palto'] },
  { fullName: 'Kamola Tosheva', email: 'kamola@chevarxona.uz', phone: '+998 90 555 66 77', roleKey: 'INVENTORY_CLERK' }
]

interface DemoClient {
  fullName: string
  phone: string
  telegramId?: string
  address: string
  tags?: string[]
  notes?: string
  secondaryPhone?: string
}

const CLIENTS: DemoClient[] = [
  { fullName: 'Anvar Karimov', phone: '+998 90 123 45 67', telegramId: '@anvarkarimov', address: 'Toshkent, Yunusobod 4-mavze, 12-uy', tags: ['VIP'], notes: 'Klassik kostyumlarni afzal ko‘radi, yengi tor bo‘lsin.' },
  { fullName: 'Gulnora Abdullayeva', phone: '+998 91 234 56 78', telegramId: '@gulnora_a', address: 'Toshkent, Chilonzor 19-mavze', tags: ['VIP'], notes: 'Har o‘lchovni onlayn tasdiqlaydi.' },
  { fullName: 'Sardor Mirzayev', phone: '+998 93 345 67 89', address: 'Toshkent, Mirzo Ulug‘bek tumani', notes: 'Ish kostyumi uchun doimiy mijoz.' },
  { fullName: 'Zilola Nazarova', phone: '+998 94 456 78 90', telegramId: '@zilola_n', address: 'Toshkent, Olmazor tumani', tags: ['To‘y'], notes: 'Nikoh ko‘ylagi ustida ishlayapmiz.' },
  { fullName: 'Jasur Qosimov', phone: '+998 95 567 89 01', address: 'Samarqand, Registon ko‘chasi', notes: 'Chapan va milliy kiyim buyurtma qiladi.' },
  { fullName: 'Nilufar Rahimova', phone: '+998 97 678 90 12', telegramId: '@nilufar_r', address: 'Toshkent, Shayxontohur tumani', tags: ['Ulgurji'] },
  { fullName: 'Ulug‘bek Sobirov', phone: '+998 88 789 01 23', address: 'Toshkent, Sergeli tumani', notes: 'Sport kostyumlar uchun.' },
  { fullName: 'Madina Yo‘ldosheva', phone: '+998 90 890 12 34', telegramId: '@madina_y', address: 'Toshkent, Yakkasaroy tumani', tags: ['VIP'], notes: 'Atlas ko‘ylakni Qodiriy uslubida so‘radi.' },
  { fullName: 'Rustam Eshonov', phone: '+998 91 901 23 45', address: 'Buxoro, Bahouddin Naqshband ko‘chasi', notes: 'Yozgi kostyum.' },
  { fullName: 'Malika Iskandarova', phone: '+998 93 012 34 56', telegramId: '@malika_i', address: 'Toshkent, Mirobod tumani', tags: ['To‘y'] },
  { fullName: 'Farrux Tursunov', phone: '+998 94 135 79 02', address: 'Toshkent, Yashnobod tumani', notes: 'Bolalar kostyumlari — ikki farzandi uchun.' },
  { fullName: 'Dildora Xolmatova', phone: '+998 97 246 80 13', telegramId: '@dildora_x', address: 'Nukus, Do‘stlik ko‘chasi', tags: ['Ulgurji'] }
]

interface OrderSpec {
  client: number
  slug: string
  quantity: number
  status: OrderStatus
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  tailor?: number
  advance?: number
  fitting?: number
  deadline: number
  order: number
  notes?: string
}

/** Offsets are in days relative to today, so the demo always looks current. */
const ORDERS: OrderSpec[] = [
  { client: 0, slug: 'two-piece-suit', quantity: 1, status: 'IN_TAILORING', priority: 'HIGH', tailor: 0, advance: 1_000_000, fitting: -14, deadline: 4, order: -22, notes: 'Ko‘krak cho‘ntagi ichkariga, ipak astar.' },
  { client: 1, slug: 'evening-dress', quantity: 1, status: 'FITTING_STAGE', priority: 'URGENT', tailor: 1, advance: 1_500_000, fitting: -2, deadline: 6, order: -18, notes: 'Bel choki yana 2 sm tor.' },
  { client: 2, slug: 'dress-shirt', quantity: 3, status: 'READY_FOR_PICKUP', priority: 'NORMAL', tailor: 0, advance: 200_000, deadline: 2, order: -12, notes: 'Manjet yumaloq, monogramma bosilsin.' },
  { client: 3, slug: 'atlas-dress', quantity: 1, status: 'IN_CUTTING', priority: 'HIGH', tailor: 1, advance: 700_000, fitting: -1, deadline: 15, order: -6, notes: 'To‘yga 3 hafta qoldi.' },
  { client: 4, slug: 'chapan', quantity: 2, status: 'MATERIAL_ALLOCATED', priority: 'NORMAL', advance: 500_000, deadline: 18, order: -4 },
  { client: 5, slug: 'trousers', quantity: 4, status: 'COMPLETED', priority: 'NORMAL', tailor: 2, advance: 2_800_000, deadline: -3, order: -30, notes: 'Ulgurji buyurtma, hammasi topshirildi.' },
  { client: 6, slug: 'tracksuit', quantity: 2, status: 'IN_TAILORING', priority: 'NORMAL', tailor: 2, advance: 400_000, deadline: 8, order: -10 },
  { client: 7, slug: 'atlas-dress', quantity: 1, status: 'DRAFT', priority: 'NORMAL', deadline: 25, order: -1, notes: 'Mato tanlanishi kutilmoqda.' },
  { client: 8, slug: 'summer-suit', quantity: 1, status: 'PENDING_DEPOSIT', priority: 'LOW', fitting: 3, deadline: 20, order: -2, notes: 'Avans to‘lovni kutmoqda.' },
  { client: 9, slug: 'evening-dress', quantity: 1, status: 'MATERIAL_ALLOCATED', priority: 'HIGH', tailor: 1, advance: 1_200_000, fitting: 4, deadline: 22, order: -5 },
  { client: 10, slug: 'kids-suit', quantity: 2, status: 'READY_FOR_PICKUP', priority: 'NORMAL', tailor: 2, advance: 300_000, deadline: 1, order: -14, notes: 'Farzandlari uchun bayram kostyumi.' },
  { client: 11, slug: 'overcoat', quantity: 3, status: 'IN_CUTTING', priority: 'HIGH', tailor: 2, advance: 1_800_000, deadline: 12, order: -7 },
  { client: 0, slug: 'trousers', quantity: 2, status: 'COMPLETED', priority: 'LOW', tailor: 2, advance: 1_400_000, deadline: -10, order: -40 },
  { client: 1, slug: 'dress-shirt', quantity: 1, status: 'CANCELLED', priority: 'NORMAL', deadline: -6, order: -20, notes: 'Mijoz bekor qildi — mato yetkazilmadi.' },
  { client: 2, slug: 'two-piece-suit', quantity: 1, status: 'PENDING_DEPOSIT', priority: 'URGENT', fitting: 2, deadline: 10, order: -3 },
  { client: 9, slug: 'chapan', quantity: 1, status: 'FITTING_STAGE', priority: 'NORMAL', tailor: 0, advance: 400_000, fitting: 0, deadline: 9, order: -11 }
]

/** Realistic centimetre defaults; unknown keys fall back to a mid-range value. */
const MEASUREMENT_VALUES: Record<string, number> = {
  height: 178, chest: 102, waist: 88, hips: 100, shoulder: 46, sleeve: 62,
  jacket_length: 76, neck: 40, bicep: 36, trouser_waist: 86, inseam: 82,
  thigh: 58, cuff: 38, shirt_length: 78, outseam: 104, knee: 42, crotch: 26,
  bust: 92, under_bust: 78, dress_length: 112, back_width: 38, bust_point: 18,
  coat_length: 108, full_length: 118, hem_width: 62
}

function daysFromNow(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

/** Item status implied by the order status, mirroring the status API. */
function itemStatusFor(status: OrderStatus): OrderItemStatus {
  if (status === 'COMPLETED' || status === 'READY_FOR_PICKUP') return 'COMPLETED'
  if (status === 'FITTING_STAGE') return 'FITTING_REQUIRED'
  if (status === 'IN_TAILORING') return 'IN_PROGRESS'
  if (status === 'IN_CUTTING' || status === 'MATERIAL_ALLOCATED') return 'CUTTING'
  return 'PENDING'
}

/**
 * Bootstraps a workshop that is worth looking at: staff to assign work to,
 * clients with measurement history, and orders spread across every Kanban lane.
 * Stock movements are written through the real engine so reservations, the
 * ledger and the balances stay consistent.
 */
export async function seedDemoWorkshop(roleIds: Record<RoleKey, string>) {
  const staff = await seedStaff(roleIds)
  const clients = await seedClients(staff.managerId)
  await seedOrders(clients, staff)

  console.info(
    '[chevarxona] Demo workshop seeded — staff accounts share the password'
    + ` "${DEMO_STAFF_PASSWORD}".`
  )
}

async function seedStaff(roleIds: Record<RoleKey, string>) {
  const existing = await User.find({ roleKey: { $ne: 'SUPER_ADMIN' } }).select('fullName roleKey').lean()
  const passwordHash = await hashPassword(DEMO_STAFF_PASSWORD)

  for (const person of STAFF) {
    if (existing.some(user => user.fullName === person.fullName)) continue
    await User.create({
      fullName: person.fullName,
      email: person.email,
      phone: person.phone,
      passwordHash,
      roleKey: person.roleKey,
      role: roleIds[person.roleKey],
      specialties: person.specialties ?? [],
      isActive: true
    })
  }

  const users = await User.find({ roleKey: { $ne: 'SUPER_ADMIN' } }).select('fullName roleKey _id').lean()
  const manager = users.find(user => user.roleKey === 'MANAGER')

  return {
    managerId: manager ? String(manager._id) : '',
    managerName: manager?.fullName ?? 'Menejer',
    tailors: users
      .filter(user => user.roleKey === 'TAILOR')
      .map(user => ({ id: String(user._id), fullName: user.fullName }))
  }
}

async function seedClients(createdBy: string) {
  const existing = await Client.find().select('fullName phone').lean()
  const known = new Set(existing.map(client => client.fullName))

  for (const person of CLIENTS) {
    if (known.has(person.fullName)) continue
    await Client.create({
      fullName: person.fullName,
      phone: person.phone,
      secondaryPhone: person.secondaryPhone ?? '',
      telegramId: person.telegramId ?? '',
      address: person.address,
      notes: person.notes ?? '',
      tags: person.tags ?? [],
      createdBy: createdBy || null
    })
  }

  return Client.find().sort({ createdAt: 1 })
}

interface DemoStaffPool {
  managerId: string
  managerName: string
  tailors: Array<{ id: string, fullName: string }>
}

async function seedOrders(
  clients: Awaited<ReturnType<typeof seedClients>>,
  staff: DemoStaffPool
) {
  if (await Order.countDocuments()) return
  if (!clients.length) return

  const categories = await GarmentCategory.find().lean()
  const bySlug = new Map(categories.map(category => [category.slug, category]))
  const materials = await materialIndex()

  const actor = {
    id: staff.managerId,
    fullName: staff.managerName,
    roleKey: 'MANAGER',
    permissions: []
  } as unknown as SessionUser

  // Per-client rollups, applied once at the end instead of per order.
  const rollups = new Map<string, { orders: number, debt: number, spent: number, last: Date }>()
  // Cached so a client with several orders only ever gets one profile.
  const profiles = new Map<string, MeasurementSnapshot>()

  for (const spec of ORDERS) {
    const client = clients[spec.client % clients.length]!
    const category = bySlug.get(spec.slug)
    if (!category) continue

    const tailor = spec.tailor !== undefined && staff.tailors.length
      ? staff.tailors[spec.tailor % staff.tailors.length]
      : undefined
    const orderDate = daysFromNow(spec.order)

    const clientKey = String(client._id)
    let profile = profiles.get(clientKey)
    if (!profile) {
      profile = await ensureMeasurementProfile(client, category, staff.managerId, spec.client)
      profiles.set(clientKey, profile)
    }

    const item = {
      garmentCategory: category._id,
      garmentName: category.name,
      quantity: spec.quantity,
      unitPrice: category.basePrice || 0,
      assignedTailor: tailor?.id ?? null,
      assignedTailorName: tailor?.fullName ?? '',
      status: itemStatusFor(spec.status),
      measurements: profile.values,
      measurementProfileName: profile.name,
      allocations: expandBomTemplate(category.bomTemplate as never, spec.quantity).map(line => {
        const material = materials.get(String(line.material))
        return {
          materialType: line.materialType,
          material: line.material,
          materialModel: line.materialModel,
          name: material?.name ?? line.label,
          sku: material?.sku ?? '',
          unit: line.unit || material?.unit || 'm',
          plannedQty: line.plannedQty,
          consumedQty: spec.status === 'COMPLETED' ? line.plannedQty : 0,
          unitCost: material?.costPerUnit ?? 0
        }
      })
    }

    const advance = spec.advance ?? 0
    const orderNumber = await nextOrderNumber()

    const order = new Order({
      orderNumber,
      client: client._id,
      clientName: client.fullName,
      clientPhone: client.phone,
      status: spec.status,
      orderDate,
      fittingDate: spec.fitting !== undefined ? daysFromNow(spec.fitting) : null,
      deadline: daysFromNow(spec.deadline),
      items: [item],
      discount: 0,
      priority: spec.priority,
      notes: spec.notes ?? '',
      stockPhase: 'none',
      payments: advance > 0
        ? [{
            amount: advance,
            method: 'CASH',
            note: 'Avans to‘lov',
            receivedBy: staff.managerId || null,
            receivedAt: daysFromNow(spec.order)
          }]
        : [],
      statusHistory: [{
        from: null,
        to: spec.status,
        note: '',
        by: staff.managerId || null,
        byName: staff.managerName,
        at: daysFromNow(spec.order)
      }],
      createdBy: staff.managerId || null
    })

    order.recalculateTotals()

    // Route the order through the real stock engine so reservations, ledger
    // entries and the remaining shelf quantity all agree.
    const phase = stockPhase(spec.status)
    if (phase !== 'none') {
      await transitionStockPhase(collectAllocations(order), 'none', phase, {
        actor,
        orderId: String(order._id),
        orderNumber,
        reason: `Demo buyurtma ${orderNumber}`
      })
      order.stockPhase = phase
    }

    await order.save()

    const current = rollups.get(clientKey) ?? { orders: 0, debt: 0, spent: 0, last: orderDate }
    current.orders += 1
    if (spec.status !== 'CANCELLED') current.debt += order.balanceDue
    if (spec.status === 'COMPLETED') current.spent += order.advancePayment
    if (orderDate > current.last) current.last = orderDate
    rollups.set(clientKey, current)
  }

  for (const [clientId, rollup] of rollups) {
    await Client.updateOne(
      { _id: clientId },
      {
        $inc: { totalOrders: rollup.orders, debtBalance: rollup.debt, totalSpent: rollup.spent },
        $set: { lastOrderAt: rollup.last }
      }
    )
  }
}

interface MeasurementSnapshot {
  name: string
  values: Array<{ key: string, label: string, value: number, unit: string }>
}

/** One active measurement profile per client, derived from the garment fields. */
async function ensureMeasurementProfile(
  client: { _id: Types.ObjectId, measurements?: unknown[] },
  category: { _id: Types.ObjectId, name: string, measurementFields: Array<{ key: string, label: string, unit: string, min: number, max: number }> },
  takenBy: string,
  variation: number
): Promise<MeasurementSnapshot> {
  const existing = (client.measurements ?? []).length
  if (existing > 0) {
    const first = (client.measurements as unknown as MeasurementSnapshot[])[0]!
    return { name: first.name, values: first.values }
  }

  const drift = (variation % 5) - 2
  const values = category.measurementFields.map((field) => {
    const base = MEASUREMENT_VALUES[field.key] ?? Math.round((field.min + field.max) / 2)
    return {
      key: field.key,
      label: field.label,
      value: Math.max(field.min, Math.min(field.max, base + drift)),
      unit: field.unit
    }
  })

  const name = `${category.name} — asosiy`
  await Client.updateOne(
    { _id: client._id },
    {
      $push: {
        measurements: {
          name,
          garmentCategory: category._id,
          garmentCategoryName: category.name,
          version: 1,
          isActive: true,
          values,
          notes: 'Demo uchun kiritilgan o‘lchovlar.',
          takenBy: takenBy || null,
          takenAt: new Date()
        }
      }
    }
  )

  return { name, values }
}

/** Flat lookup so allocation lines can carry the material name, SKU and cost. */
async function materialIndex() {
  const [fabrics, accessories] = await Promise.all([
    Fabric.find().select('name sku unit costPerUnit').lean(),
    Accessory.find().select('name sku unit costPerUnit').lean()
  ])

  const map = new Map<string, { name: string, sku: string, unit: string, costPerUnit: number }>()
  for (const doc of [...fabrics, ...accessories]) {
    map.set(String(doc._id), {
      name: doc.name,
      sku: doc.sku,
      unit: doc.unit,
      costPerUnit: doc.costPerUnit ?? 0
    })
  }
  return map
}
