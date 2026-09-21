/** Order life-cycle definition shared by the API guard and the Kanban board. */

export const ORDER_STATUSES = [
  'DRAFT',
  'PENDING_DEPOSIT',
  'MATERIAL_ALLOCATED',
  'IN_CUTTING',
  'IN_TAILORING',
  'FITTING_STAGE',
  'READY_FOR_PICKUP',
  'COMPLETED',
  'CANCELLED'
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Statuses rendered as Kanban lanes (terminal `CANCELLED` is filtered out of the board). */
export const KANBAN_STATUSES: OrderStatus[] = [
  'DRAFT',
  'PENDING_DEPOSIT',
  'MATERIAL_ALLOCATED',
  'IN_CUTTING',
  'IN_TAILORING',
  'FITTING_STAGE',
  'READY_FOR_PICKUP',
  'COMPLETED'
]

export const ORDER_STATUS_META: Record<OrderStatus, {
  label: string
  short: string
  color: 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'
  icon: string
  description: string
}> = {
  DRAFT: {
    label: 'Draft', short: 'Draft', color: 'neutral', icon: 'i-lucide-file-pen',
    description: 'Being written up — nothing is reserved yet.'
  },
  PENDING_DEPOSIT: {
    label: 'Pending Deposit', short: 'Deposit', color: 'warning', icon: 'i-lucide-hand-coins',
    description: 'Waiting for the client advance payment.'
  },
  MATERIAL_ALLOCATED: {
    label: 'Material Allocated', short: 'Allocated', color: 'secondary', icon: 'i-lucide-boxes',
    description: 'Fabric and accessories are soft-reserved for this order.'
  },
  IN_CUTTING: {
    label: 'In Cutting', short: 'Cutting', color: 'info', icon: 'i-lucide-scissors',
    description: 'Fabric is being cut — stock is permanently deducted here.'
  },
  IN_TAILORING: {
    label: 'In Tailoring', short: 'Tailoring', color: 'primary', icon: 'i-lucide-shirt',
    description: 'Assigned tailors are sewing the garments.'
  },
  FITTING_STAGE: {
    label: 'Fitting Stage', short: 'Fitting', color: 'secondary', icon: 'i-lucide-ruler',
    description: 'Client fitting scheduled or adjustments in progress.'
  },
  READY_FOR_PICKUP: {
    label: 'Ready for Pickup', short: 'Ready', color: 'success', icon: 'i-lucide-package-check',
    description: 'Finished and waiting for the client to collect.'
  },
  COMPLETED: {
    label: 'Completed', short: 'Done', color: 'success', icon: 'i-lucide-circle-check-big',
    description: 'Handed over and settled.'
  },
  CANCELLED: {
    label: 'Cancelled', short: 'Cancelled', color: 'error', icon: 'i-lucide-circle-slash',
    description: 'Cancelled — any reserved material has been released.'
  }
}

/**
 * Allowed forward/backward moves. Kept deliberately strict so the stock
 * side-effects (reserve / consume / release) stay in sync with the status.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['PENDING_DEPOSIT', 'MATERIAL_ALLOCATED', 'CANCELLED'],
  PENDING_DEPOSIT: ['MATERIAL_ALLOCATED', 'DRAFT', 'CANCELLED'],
  MATERIAL_ALLOCATED: ['IN_CUTTING', 'PENDING_DEPOSIT', 'CANCELLED'],
  IN_CUTTING: ['IN_TAILORING', 'MATERIAL_ALLOCATED', 'CANCELLED'],
  IN_TAILORING: ['FITTING_STAGE', 'READY_FOR_PICKUP', 'IN_CUTTING', 'CANCELLED'],
  FITTING_STAGE: ['READY_FOR_PICKUP', 'IN_TAILORING', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'FITTING_STAGE', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['DRAFT']
}

/** Statuses at or beyond which materials are soft-reserved. */
export const RESERVED_FROM: OrderStatus = 'MATERIAL_ALLOCATED'
/** Statuses at or beyond which materials are physically consumed. */
export const CONSUMED_FROM: OrderStatus = 'IN_CUTTING'

const PIPELINE_ORDER: OrderStatus[] = [
  'DRAFT', 'PENDING_DEPOSIT', 'MATERIAL_ALLOCATED', 'IN_CUTTING',
  'IN_TAILORING', 'FITTING_STAGE', 'READY_FOR_PICKUP', 'COMPLETED'
]

export function statusRank(status: OrderStatus): number {
  const index = PIPELINE_ORDER.indexOf(status)
  return index === -1 ? -1 : index
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/** How the stock ledger should behave for a given status. */
export function stockPhase(status: OrderStatus): 'none' | 'reserved' | 'consumed' {
  if (status === 'CANCELLED') return 'none'
  const rank = statusRank(status)
  if (rank >= statusRank(CONSUMED_FROM)) return 'consumed'
  if (rank >= statusRank(RESERVED_FROM)) return 'reserved'
  return 'none'
}

export const ITEM_STATUSES = [
  'PENDING', 'CUTTING', 'IN_PROGRESS', 'FITTING_REQUIRED', 'COMPLETED'
] as const
export type OrderItemStatus = (typeof ITEM_STATUSES)[number]

export const ITEM_STATUS_META: Record<OrderItemStatus, { label: string, color: string, icon: string }> = {
  PENDING: { label: 'Pending', color: 'neutral', icon: 'i-lucide-circle-dashed' },
  CUTTING: { label: 'Cutting', color: 'info', icon: 'i-lucide-scissors' },
  IN_PROGRESS: { label: 'In Progress', color: 'primary', icon: 'i-lucide-loader' },
  FITTING_REQUIRED: { label: 'Fitting Required', color: 'warning', icon: 'i-lucide-ruler' },
  COMPLETED: { label: 'Completed', color: 'success', icon: 'i-lucide-check' }
}
