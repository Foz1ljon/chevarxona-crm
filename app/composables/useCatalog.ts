export interface MeasurementField {
  key: string
  label: string
  unit: string
  required: boolean
  min: number
  max: number
  hint: string
  order: number
}

export interface BomLine {
  materialType: 'FABRIC' | 'ACCESSORY'
  material: string | { _id: string, name: string, sku: string, unit: string, stockQty: number, reservedQty: number, costPerUnit: number }
  materialModel: 'Fabric' | 'Accessory'
  accessoryCategory: string
  label: string
  quantity: number
  unit: string
  wastagePercent: number
  optional: boolean
}

export interface GarmentCategory {
  _id: string
  name: string
  slug: string
  description: string
  icon: string
  basePrice: number
  estimatedDays: number
  measurementFields: MeasurementField[]
  bomTemplate: BomLine[]
  isActive: boolean
  sortOrder: number
}

export function useCatalog() {
  const toast = useApiToast()
  const { t } = useI18n()

  function categories(options: { populate?: boolean, active?: 'true' | 'false' | 'all' } = {}) {
    return useFetch<{ items: GarmentCategory[] }>('/api/catalog/garment-categories', {
      query: {
        populate: String(options.populate ?? false),
        active: options.active ?? 'true'
      },
      default: () => ({ items: [] })
    })
  }

  async function create(body: Record<string, unknown>) {
    const category = await $fetch<GarmentCategory>('/api/catalog/garment-categories', { method: 'POST', body })
    toast.success(t('catalog.created'), category.name)
    return category
  }

  async function update(id: string, body: Record<string, unknown>) {
    const category = await $fetch<GarmentCategory>(`/api/catalog/garment-categories/${id}`, { method: 'PATCH', body })
    toast.success(t('catalog.updated'), category.name)
    return category
  }

  async function remove(id: string) {
    const result = await $fetch<{ deleted: boolean, deactivated: boolean, inUse?: number }>(
      `/api/catalog/garment-categories/${id}`,
      { method: 'DELETE' }
    )
    toast.success(result.deactivated ? t('catalog.typeDeactivated') : t('catalog.typeDeleted'))
    return result
  }

  return { categories, create, update, remove }
}
