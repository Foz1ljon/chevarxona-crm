import { Order } from '../../models/Order'
import { Client } from '../../models/Client'
import { Fabric } from '../../models/Fabric'
import { Accessory } from '../../models/Accessory'
import { connectToDatabase } from '../../utils/db'
import { requirePermission, hasPermission } from '../../utils/auth'
import { scopeFilterForUser } from '../../utils/orders'
import { KANBAN_STATUSES, type OrderStatus } from '../../../shared/utils/orderStatus'
import type { DashboardStats } from '../../../shared/types/dashboard'

const OPEN = { $nin: ['COMPLETED', 'CANCELLED'] as OrderStatus[] }

function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Single round-trip dashboard feed. Every figure is computed with an
 * aggregation pipeline rather than in JS so the numbers stay correct on
 * collections far larger than a page of results.
 */
export default defineEventHandler(async (event): Promise<DashboardStats> => {
  const user = await requirePermission(event, 'dashboard:read')
  await connectToDatabase()

  const scope = scopeFilterForUser(user)
  const today = startOfDay()
  const tomorrow = addDays(today, 1)
  const weekEnd = addDays(today, 7)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)

  const lowStockStage = [
    { $match: { isActive: true } },
    {
      $addFields: {
        availableQty: {
          $max: [0, { $subtract: [{ $ifNull: ['$stockQty', 0] }, { $ifNull: ['$reservedQty', 0] }] }]
        }
      }
    },
    { $match: { $expr: { $lte: ['$availableQty', { $ifNull: ['$minThreshold', 0] }] } } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        outOfStock: { $sum: { $cond: [{ $lte: ['$availableQty', 0] }, 1, 0] } }
      }
    }
  ]

  const [
    pipeline,
    fittings,
    overdue,
    financials,
    revenueTrend,
    lowFabrics,
    lowAccessories,
    stockValue,
    topGarments,
    tailorLoad,
    clientTotals,
    recentOrders
  ] = await Promise.all([
    // Orders grouped by status → Kanban counts + value per lane.
    Order.aggregate([
      { $match: { ...scope, status: { $in: KANBAN_STATUSES } } },
      { $group: { _id: '$status', count: { $sum: 1 }, value: { $sum: '$totalPrice' } } }
    ]),

    // Fittings due today and within the next 7 days.
    Order.aggregate([
      { $match: { ...scope, status: OPEN, fittingDate: { $ne: null } } },
      {
        $group: {
          _id: null,
          today: { $sum: { $cond: [{ $and: [{ $gte: ['$fittingDate', today] }, { $lt: ['$fittingDate', tomorrow] }] }, 1, 0] } },
          week: { $sum: { $cond: [{ $and: [{ $gte: ['$fittingDate', today] }, { $lt: ['$fittingDate', weekEnd] }] }, 1, 0] } },
          overdueFittings: { $sum: { $cond: [{ $lt: ['$fittingDate', today] }, 1, 0] } }
        }
      }
    ]),

    Order.countDocuments({ ...scope, status: OPEN, deadline: { $lt: today } }),

    // Money: this month's collections vs. all outstanding receivables.
    Order.aggregate([
      { $match: { ...scope, status: { $ne: 'CANCELLED' } } },
      {
        $facet: {
          outstanding: [
            { $match: { status: OPEN } },
            { $group: { _id: null, debt: { $sum: '$balanceDue' }, orders: { $sum: 1 } } }
          ],
          monthRevenue: [
            { $unwind: '$payments' },
            { $match: { 'payments.receivedAt': { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$payments.amount' }, count: { $sum: 1 } } }
          ],
          monthBooked: [
            { $match: { orderDate: { $gte: monthStart } } },
            { $group: { _id: null, total: { $sum: '$totalPrice' }, count: { $sum: 1 } } }
          ],
          activeOrders: [
            { $match: { status: OPEN } },
            { $count: 'total' }
          ]
        }
      }
    ]),

    // Six-month collection trend for the dashboard chart.
    Order.aggregate([
      { $match: { ...scope, status: { $ne: 'CANCELLED' } } },
      { $unwind: '$payments' },
      { $match: { 'payments.receivedAt': { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$payments.receivedAt' }, month: { $month: '$payments.receivedAt' } },
          revenue: { $sum: '$payments.amount' },
          payments: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]),

    Fabric.aggregate(lowStockStage),
    Accessory.aggregate(lowStockStage),

    Promise.all([
      Fabric.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, value: { $sum: { $multiply: ['$stockQty', { $ifNull: ['$costPerUnit', 0] }] } } } }
      ]),
      Accessory.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, value: { $sum: { $multiply: ['$stockQty', { $ifNull: ['$costPerUnit', 0] }] } } } }
      ])
    ]),

    Order.aggregate([
      { $match: { ...scope, status: { $ne: 'CANCELLED' }, orderDate: { $gte: sixMonthsAgo } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.garmentName',
          count: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]),

    Order.aggregate([
      { $match: { status: OPEN } },
      { $unwind: '$items' },
      { $match: { 'items.assignedTailor': { $ne: null }, 'items.status': { $ne: 'COMPLETED' } } },
      {
        $group: {
          _id: { tailor: '$items.assignedTailor', name: '$items.assignedTailorName' },
          garments: { $sum: '$items.quantity' },
          orders: { $addToSet: '$_id' }
        }
      },
      { $project: { name: '$_id.name', tailor: '$_id.tailor', garments: 1, orders: { $size: '$orders' } } },
      { $sort: { garments: -1 } },
      { $limit: 8 }
    ]),

    hasPermission(user, 'clients:read')
      ? Client.aggregate([
          { $match: { isArchived: false } },
          { $group: { _id: null, total: { $sum: 1 }, debtors: { $sum: { $cond: [{ $gt: ['$debtBalance', 0] }, 1, 0] } } } }
        ])
      : Promise.resolve([]),

    Order.find({ ...scope })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('orderNumber clientName status totalPrice balanceDue deadline priority createdAt')
      .lean()
  ])

  const facet = financials[0] ?? {}
  const pipelineMap = new Map(pipeline.map(row => [row._id, row]))
  const lowFab = lowFabrics[0] ?? { count: 0, outOfStock: 0 }
  const lowAcc = lowAccessories[0] ?? { count: 0, outOfStock: 0 }

  return {
    kpis: {
      activeOrders: facet.activeOrders?.[0]?.total ?? 0,
      fittingsToday: fittings[0]?.today ?? 0,
      fittingsThisWeek: fittings[0]?.week ?? 0,
      overdueFittings: fittings[0]?.overdueFittings ?? 0,
      overdueOrders: overdue,
      monthRevenue: facet.monthRevenue?.[0]?.total ?? 0,
      monthPayments: facet.monthRevenue?.[0]?.count ?? 0,
      monthBooked: facet.monthBooked?.[0]?.total ?? 0,
      monthOrders: facet.monthBooked?.[0]?.count ?? 0,
      outstandingDebt: facet.outstanding?.[0]?.debt ?? 0,
      unpaidOrders: facet.outstanding?.[0]?.orders ?? 0,
      lowStockCount: lowFab.count + lowAcc.count,
      outOfStockCount: lowFab.outOfStock + lowAcc.outOfStock,
      stockValue: (stockValue[0][0]?.value ?? 0) + (stockValue[1][0]?.value ?? 0),
      totalClients: clientTotals[0]?.total ?? 0,
      clientsInDebt: clientTotals[0]?.debtors ?? 0
    },
    pipeline: KANBAN_STATUSES.map(status => ({
      status,
      count: pipelineMap.get(status)?.count ?? 0,
      value: pipelineMap.get(status)?.value ?? 0
    })),
    revenueTrend: revenueTrend.map(row => ({
      label: `${row._id.year}-${String(row._id.month).padStart(2, '0')}`,
      revenue: row.revenue,
      payments: row.payments
    })),
    topGarments: topGarments.map(row => ({ name: row._id, count: row.count, revenue: row.revenue })),
    tailorWorkload: tailorLoad.map(row => ({
      id: String(row.tailor),
      name: row.name || 'Unassigned',
      garments: row.garments,
      orders: row.orders
    })),
    // Lean docs carry ObjectId/Date values; the contract promises the
    // JSON-serialised shape the client actually receives.
    recentOrders: recentOrders as unknown as DashboardStats['recentOrders']
  }
})
