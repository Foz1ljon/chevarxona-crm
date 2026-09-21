export interface MeasurementValue {
  key: string
  label: string
  value: number
  unit: string
}

export interface MeasurementProfile {
  _id: string
  name: string
  garmentCategory: string | null
  garmentCategoryName: string
  version: number
  isActive: boolean
  values: MeasurementValue[]
  notes: string
  takenAt: string
}

export interface Client {
  _id: string
  fullName: string
  phone: string
  secondaryPhone: string
  telegramId: string
  address: string
  notes: string
  tags: string[]
  totalOrders: number
  totalSpent: number
  debtBalance: number
  lastOrderAt: string | null
  measurements?: MeasurementProfile[]
  measurementProfiles?: number
  isArchived: boolean
  createdAt: string
}

export function useClients() {
  const toast = useApiToast()
  const { t } = useI18n()
  // Forwards the incoming cookies while rendering on the server. The client
  // page loads its measurement profiles during setup, and a bare `$fetch`
  // reaches the API without the session — a hard reload would 401.
  const requestFetch = useRequestFetch()

  function list(query: MaybeRefOrGetter<Record<string, unknown>>) {
    return useFetch<{ items: Client[], total: number, page: number, pages: number, limit: number }>(
      '/api/clients',
      { query: computed(() => toValue(query)), default: () => ({ items: [], total: 0, page: 1, pages: 1, limit: 25 }) }
    )
  }

  function get(id: MaybeRefOrGetter<string>) {
    return useFetch<{ client: Client, orders: Array<Record<string, unknown>> }>(
      () => `/api/clients/${toValue(id)}`
    )
  }

  async function search(term: string) {
    const { items } = await $fetch<{ items: Client[] }>('/api/clients', {
      query: { search: term, limit: 20 }
    })
    return items
  }

  async function measurements(id: string, activeOnly = true) {
    return requestFetch<{ clientName: string, profiles: MeasurementProfile[] }>(
      `/api/clients/${id}/measurements`,
      { query: { activeOnly: String(activeOnly) } }
    )
  }

  async function create(body: Record<string, unknown>) {
    const client = await $fetch<Client>('/api/clients', { method: 'POST', body })
    toast.success(t('clients.added'), client.fullName)
    return client
  }

  async function update(id: string, body: Record<string, unknown>) {
    const client = await $fetch<Client>(`/api/clients/${id}`, { method: 'PATCH', body })
    toast.success(t('clients.updated'), client.fullName)
    return client
  }

  async function saveMeasurements(id: string, body: Record<string, unknown>) {
    const client = await $fetch<Client>(`/api/clients/${id}/measurements`, { method: 'POST', body })
    toast.success(t('measurements.saved'), t('measurements.savedHint'))
    return client
  }

  async function remove(id: string) {
    const result = await $fetch<{ deleted: boolean, archived: boolean, orderCount?: number }>(
      `/api/clients/${id}`,
      { method: 'DELETE' }
    )
    toast.success(
      result.archived ? t('clients.archived') : t('clients.deleted'),
      result.archived ? t('clients.ordersKeep', { n: result.orderCount ?? 0 }) : undefined
    )
    return result
  }

  return { list, get, search, measurements, create, update, saveMeasurements, remove }
}
