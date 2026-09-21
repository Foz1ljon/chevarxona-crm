import type { OrderStatus } from '#shared/utils/orderStatus'

export interface OrderAllocation {
  materialType: 'FABRIC' | 'ACCESSORY'
  material: string
  materialModel: 'Fabric' | 'Accessory'
  name: string
  sku: string
  unit: string
  plannedQty: number
  consumedQty: number
  unitCost: number
}

export interface OrderItem {
  _id: string
  garmentCategory: string
  garmentName: string
  quantity: number
  unitPrice: number
  assignedTailor: string | null
  assignedTailorName: string
  status: string
  measurements: Array<{ key: string, label: string, value: number, unit: string }>
  measurementProfileName: string
  allocations: OrderAllocation[]
  notes: string
  referenceImages: string[]
  startedAt: string | null
  completedAt: string | null
}

export interface Order {
  _id: string
  orderNumber: string
  client: string | { _id: string, fullName: string, phone: string, debtBalance?: number }
  clientName: string
  clientPhone: string
  status: OrderStatus
  orderDate: string
  fittingDate: string | null
  deadline: string | null
  items: OrderItem[]
  subtotal: number
  discount: number
  totalPrice: number
  advancePayment: number
  balanceDue: number
  payments: Array<{ _id: string, amount: number, method: string, note: string, receivedAt: string }>
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  notes: string
  stockPhase: 'none' | 'reserved' | 'consumed'
  statusHistory: Array<{ from: string | null, to: string, note: string, byName: string, at: string }>
  createdAt: string
}

export interface OrderListQuery {
  page?: number
  limit?: number
  search?: string
  status?: string
  client?: string
  tailor?: string
  priority?: string
  overdue?: string
  unpaid?: string
  sort?: string
  dir?: 'asc' | 'desc'
}

/** Data-access layer for orders — every call funnels through here. */
export function useOrders() {
  const toast = useApiToast()
  const { t } = useI18n()
  const { orderStatus } = useLabels()
  const { formatMoney } = useFormat()

  function list(query: MaybeRefOrGetter<OrderListQuery>) {
    return useFetch<{ items: Order[], total: number, page: number, pages: number, limit: number }>(
      '/api/orders',
      { query: computed(() => toValue(query)), default: () => ({ items: [], total: 0, page: 1, pages: 1, limit: 25 }) }
    )
  }

  function board(query: MaybeRefOrGetter<{ tailor?: string, priority?: string, search?: string }>) {
    return useFetch<{
      lanes: Array<{
        status: OrderStatus
        count: number
        value: number
        outstanding: number
        orders: Array<Record<string, unknown>>
      }>
      canDrag: boolean
    }>('/api/orders/board', {
      query: computed(() => toValue(query)),
      default: () => ({ lanes: [], canDrag: false })
    })
  }

  function get(id: MaybeRefOrGetter<string>) {
    return useFetch<{ order: Order, movements: Array<Record<string, unknown>> }>(
      () => `/api/orders/${toValue(id)}`
    )
  }

  async function create(body: Record<string, unknown>) {
    const order = await $fetch<Order>('/api/orders', { method: 'POST', body })
    toast.success(t('orders.created'), t('orders.createdHint', {
      order: order.orderNumber,
      status: orderStatus(order.status).label
    }))
    return order
  }

  async function update(id: string, body: Record<string, unknown>) {
    const order = await $fetch<Order>(`/api/orders/${id}`, { method: 'PATCH', body })
    toast.success(t('orders.updated'), order.orderNumber)
    return order
  }

  async function changeStatus(id: string, status: OrderStatus, note = '') {
    return $fetch<Order>(`/api/orders/${id}/status`, { method: 'PATCH', body: { status, note } })
  }

  async function updateItem(orderId: string, itemId: string, body: Record<string, unknown>) {
    return $fetch<Order>(`/api/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body })
  }

  async function addPayment(id: string, body: { amount: number, method: string, note?: string }) {
    const order = await $fetch<Order>(`/api/orders/${id}/payments`, { method: 'POST', body })
    toast.success(t('orders.paymentRecorded'), t('orders.balanceNow', { amount: formatMoney(order.balanceDue) }))
    return order
  }

  async function remove(id: string) {
    await $fetch(`/api/orders/${id}`, { method: 'DELETE' })
    toast.success(t('orders.deleted'))
  }

  async function previewBom(items: unknown[]) {
    return $fetch<{
      lines: Array<OrderAllocation & {
        estimatedCost: number
        shortage: { required: number, available: number, missing: number } | null
      }>
      shortages: Array<{ name: string, sku: string, unit: string, required: number, available: number, missing: number }>
      canAllocate: boolean
      materialCost: number
      subtotal: number
      itemBreakdown: Array<{ garmentName: string, quantity: number, unitPrice: number, lineTotal: number }>
    }>('/api/orders/bom-preview', { method: 'POST', body: { items } })
  }

  return { list, board, get, create, update, changeStatus, updateItem, addPayment, remove, previewBom }
}
