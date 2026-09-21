export interface MaterialBase {
  _id: string
  name: string
  sku: string
  unit: string
  stockQty: number
  reservedQty: number
  availableQty: number
  minThreshold: number
  costPerUnit: number
  supplier: string
  imageUrl: string
  location: string
  notes: string
  isActive: boolean
  isLowStock?: boolean
}

export interface Fabric extends MaterialBase {
  fabricType: string
  pattern: string
  color: string
  colorHex: string
}

export interface Accessory extends MaterialBase {
  category: string
  color: string
  size: string
}

export interface StockMovement {
  _id: string
  materialType: 'FABRIC' | 'ACCESSORY'
  material: string
  materialName: string
  type: 'INTAKE' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE' | 'CONSUME' | 'RETURN'
  quantity: number
  unit: string
  balanceAfter: number
  orderNumber: string
  reason: string
  performedByName: string
  createdAt: string
}

type InventoryResponse<T> = {
  items: T[]
  total: number
  page: number
  pages: number
  limit: number
  summary: { stockValue: number, lowStockCount: number }
}

const emptyList = () => ({
  items: [], total: 0, page: 1, pages: 1, limit: 25,
  summary: { stockValue: 0, lowStockCount: 0 }
})

export function useInventory() {
  const toast = useApiToast()
  const { t } = useI18n()

  function fabrics(query: MaybeRefOrGetter<Record<string, unknown>>) {
    return useFetch<InventoryResponse<Fabric>>('/api/inventory/fabrics', {
      query: computed(() => toValue(query)),
      default: emptyList
    })
  }

  function accessories(query: MaybeRefOrGetter<Record<string, unknown>>) {
    return useFetch<InventoryResponse<Accessory>>('/api/inventory/accessories', {
      query: computed(() => toValue(query)),
      default: emptyList
    })
  }

  function lowStock() {
    return useFetch<{ items: Array<MaterialBase & { materialType: string, deficit: number }>, total: number, outOfStock: number }>(
      '/api/inventory/low-stock',
      { default: () => ({ items: [], total: 0, outOfStock: 0 }) }
    )
  }

  function movements(query: MaybeRefOrGetter<Record<string, unknown>>) {
    return useFetch<{ items: StockMovement[], total: number, page: number, pages: number }>(
      '/api/inventory/movements',
      { query: computed(() => toValue(query)), default: () => ({ items: [], total: 0, page: 1, pages: 1 }) }
    )
  }

  /** Material picker feed used by the order form and BOM editor. */
  function options() {
    return useFetch<{ fabrics: Fabric[], accessories: Accessory[] }>('/api/inventory/options', {
      default: () => ({ fabrics: [], accessories: [] })
    })
  }

  const endpoint = (type: 'FABRIC' | 'ACCESSORY') =>
    type === 'FABRIC' ? '/api/inventory/fabrics' : '/api/inventory/accessories'

  async function create(type: 'FABRIC' | 'ACCESSORY', body: Record<string, unknown>) {
    const item = await $fetch<MaterialBase>(endpoint(type), { method: 'POST', body })
    toast.success(t('inventory.itemAdded'), `${item.name} (${item.sku})`)
    return item
  }

  async function update(type: 'FABRIC' | 'ACCESSORY', id: string, body: Record<string, unknown>) {
    const item = await $fetch<MaterialBase>(`${endpoint(type)}/${id}`, { method: 'PATCH', body })
    toast.success(t('inventory.itemUpdated'), item.name)
    return item
  }

  async function remove(type: 'FABRIC' | 'ACCESSORY', id: string) {
    await $fetch(`${endpoint(type)}/${id}`, { method: 'DELETE' })
    toast.success(t('inventory.deactivated'), t('inventory.deactivatedHint'))
  }

  async function adjust(body: {
    materialType: 'FABRIC' | 'ACCESSORY'
    material: string
    mode: 'INTAKE' | 'ADJUSTMENT'
    quantity: number
    unitCost?: number
    reason?: string
  }) {
    const result = await $fetch<{ stockQty: number, availableQty: number, delta: number }>(
      '/api/inventory/adjust',
      { method: 'POST', body }
    )
    toast.success(
      body.mode === 'INTAKE' ? t('inventory.stockReceived') : t('inventory.stockCorrected'),
      t('inventory.newBalanceIs', { n: result.stockQty })
    )
    return result
  }

  return { fabrics, accessories, lowStock, movements, options, create, update, remove, adjust }
}
