import type { OrderStatus } from '../utils/orderStatus'

/**
 * Explicit contract for `/api/dashboard/stats`.
 *
 * The handler builds every figure from aggregation pipelines, which Mongoose
 * types as `any`; declaring the shape here keeps the dashboard page fully
 * typed instead of inheriting that `any`.
 */
export interface DashboardKpis {
  activeOrders: number
  fittingsToday: number
  fittingsThisWeek: number
  overdueFittings: number
  overdueOrders: number
  monthRevenue: number
  monthPayments: number
  monthBooked: number
  monthOrders: number
  outstandingDebt: number
  unpaidOrders: number
  lowStockCount: number
  outOfStockCount: number
  stockValue: number
  totalClients: number
  clientsInDebt: number
}

export interface DashboardStats {
  kpis: DashboardKpis
  pipeline: Array<{ status: OrderStatus, count: number, value: number }>
  revenueTrend: Array<{ label: string, revenue: number, payments: number }>
  topGarments: Array<{ name: string, count: number, revenue: number }>
  tailorWorkload: Array<{ id: string, name: string, garments: number, orders: number }>
  recentOrders: Array<{
    _id: string
    orderNumber: string
    clientName: string
    status: OrderStatus
    totalPrice: number
    balanceDue: number
    deadline: string | null
    priority: string
    createdAt: string
  }>
}

export interface AgendaEntry {
  type: 'FITTING' | 'DEADLINE'
  date: string
  order: {
    _id: string
    orderNumber: string
    clientName: string
    clientPhone: string
    status: OrderStatus
    priority: string
    balanceDue?: number
  }
}

export interface DashboardAgenda {
  entries: AgendaEntry[]
  from: string
  to: string
}
