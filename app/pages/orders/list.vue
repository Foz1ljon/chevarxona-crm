<script setup lang="ts">
import { ORDER_STATUSES, type OrderStatus } from '#shared/utils/orderStatus'
import type { TableColumn } from '@nuxt/ui'
import type { Order } from '~/composables/useOrders'

definePageMeta({ permission: ['orders:read', 'orders:read_assigned'] })
const { t } = useI18n()
useHead({ title: () => t('nav.orders') })

const route = useRoute()
const router = useRouter()
const { list } = useOrders()
const { orderStatus } = useLabels()
const { formatMoney, formatDate, formatRelative, daysUntil } = useFormat()

const auth = useAuthStore()
const toast = useApiToast()

/** TanStack sorting state — defaults to newest first while empty. */
const sorting = ref<Array<{ id: string, desc: boolean }>>([])

const filters = reactive({
  search: '',
  status: (route.query.status as OrderStatus | undefined) || undefined,
  unpaid: (route.query.unpaid as string) || undefined,
  overdue: (route.query.overdue as string) || undefined,
  page: 1
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const query = computed(() => ({
  page: filters.page,
  limit: 25,
  search: debounced.value || undefined,
  status: filters.status,
  unpaid: filters.unpaid,
  overdue: filters.overdue,
  sort: sorting.value[0]?.id ?? 'orderDate',
  dir: (sorting.value[0]?.desc === false ? 'asc' : 'desc') as 'asc' | 'desc'
}))

const { data, pending } = await list(query)

// Keep the URL shareable as filters change.
watch(() => ({ ...filters }), (value) => {
  router.replace({
    query: {
      ...(value.status ? { status: value.status } : {}),
      ...(value.unpaid ? { unpaid: value.unpaid } : {}),
      ...(value.overdue ? { overdue: value.overdue } : {})
    }
  })
}, { deep: true })

watch([debounced, () => filters.status, () => filters.unpaid, () => filters.overdue, sorting], () => {
  filters.page = 1
})

/** Row menu: navigation shortcuts plus the order number for pasting elsewhere. */
function clientIdOf(order: Order) {
  return typeof order.client === 'string' ? order.client : order.client._id
}

function rowActions(order: Order) {
  return [[
    { label: t('orders.openOrder'), icon: 'i-lucide-external-link', to: `/orders/${order._id}` },
    ...(auth.can('clients:read')
      ? [{ label: t('clients.openProfile'), icon: 'i-lucide-user', to: `/clients/${clientIdOf(order)}` }]
      : []),
    { label: t('common.copyNumber'), icon: 'i-lucide-copy', onSelect: () => copyOrderNumber(order.orderNumber) }
  ]]
}

async function copyOrderNumber(orderNumber: string) {
  try {
    await navigator.clipboard.writeText(orderNumber)
    toast.success(t('common.copied'), orderNumber)
  } catch {
    // Clipboard access is blocked outside secure contexts — nothing to undo.
  }
}

const statusOptions = computed(() => [
  { label: t('orders.allStatuses'), value: undefined },
  ...ORDER_STATUSES.map(status => ({ label: orderStatus(status).label, value: status }))
])

const right = { class: { th: 'text-right', td: 'text-right' } }

const columns = computed<TableColumn<Order>[]>(() => [
  { accessorKey: 'orderNumber', header: t('orders.order') },
  { accessorKey: 'clientName', header: t('orders.client') },
  { accessorKey: 'status', header: t('common.status') },
  { accessorKey: 'items', header: t('orders.garments'), enableSorting: false },
  { accessorKey: 'deadline', header: t('orders.deadline') },
  { accessorKey: 'totalPrice', header: t('common.total'), meta: right },
  { accessorKey: 'balanceDue', header: t('orders.balance'), meta: right },
  { id: 'actions', header: '', enableSorting: false, meta: { class: { th: 'w-10', td: 'w-10' } } }
])

function deadlineTone(deadline?: string | null, status?: string) {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'text-muted'
  const days = daysUntil(deadline)
  if (days === null) return 'text-dimmed'
  if (days < 0) return 'text-error font-medium'
  if (days <= 2) return 'text-warning font-medium'
  return 'text-muted'
}
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.orders')"
      :description="$t('orders.matchFilters', { n: data?.total ?? 0 })"
      icon="i-lucide-clipboard-list"
    >
      <template #actions>
        <UButton to="/orders" icon="i-lucide-columns-3" color="neutral" variant="subtle">
          {{ $t('orders.boardView') }}
        </UButton>
        <UButton v-if="$can('orders:create')" to="/orders/new" icon="i-lucide-plus">
          {{ $t('header.newOrder') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="filters.search"
          icon="i-lucide-search"
          :placeholder="$t('orders.searchPlaceholder')"
          class="w-full sm:w-72"
        />

        <USelect v-model="filters.status" :items="statusOptions" :placeholder="$t('orders.allStatuses')" class="w-48" />

        <UButton
          :variant="filters.unpaid === 'true' ? 'solid' : 'subtle'"
          :color="filters.unpaid === 'true' ? 'warning' : 'neutral'"
          icon="i-lucide-hand-coins"
          size="sm"
          @click="() => { filters.unpaid = filters.unpaid === 'true' ? undefined : 'true' }"
        >
          {{ $t('orders.unpaid') }}
        </UButton>

        <UButton
          :variant="filters.overdue === 'true' ? 'solid' : 'subtle'"
          :color="filters.overdue === 'true' ? 'error' : 'neutral'"
          icon="i-lucide-alarm-clock"
          size="sm"
          @click="() => { filters.overdue = filters.overdue === 'true' ? undefined : 'true' }"
        >
          {{ $t('orders.overdue') }}
        </UButton>
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UTable
          v-model:sorting="sorting"
          :data="data?.items ?? []"
          :columns="columns"
          :loading="pending"
          sticky="header"
          :empty="$t('orders.noneMatch')"
          :ui="{ tr: 'cursor-pointer hover:bg-elevated/50' }"
          @select="(row) => navigateTo(`/orders/${row.original._id}`)"
        >
          <template #orderNumber-cell="{ row }">
            <div class="flex items-center gap-2">
              <span class="font-mono text-xs text-toned">{{ row.original.orderNumber }}</span>
              <UBadge
                v-if="row.original.priority === 'URGENT'"
                label="!"
                color="error"
                variant="subtle"
                size="sm"
              />
            </div>
            <p class="text-[11px] text-dimmed mt-0.5">
              {{ formatDate(row.original.orderDate) }}
            </p>
          </template>

          <template #clientName-cell="{ row }">
            <p class="font-medium text-highlighted truncate max-w-[14rem]">
              {{ row.original.clientName }}
            </p>
            <p class="text-xs text-muted">
              {{ row.original.clientPhone }}
            </p>
          </template>

          <template #status-cell="{ row }">
            <SharedStatusBadge :status="row.original.status" />
          </template>

          <template #items-cell="{ row }">
            <p class="text-sm text-toned truncate max-w-[16rem]">
              {{ [...new Set(row.original.items.map(item => item.garmentName))].join(', ') || '—' }}
            </p>
            <p class="text-[11px] text-dimmed">
              {{ $t('orders.pcs', { n: row.original.items.reduce((sum, item) => sum + item.quantity, 0) }) }}
            </p>
          </template>

          <template #deadline-cell="{ row }">
            <p class="text-sm" :class="deadlineTone(row.original.deadline, row.original.status)">
              {{ row.original.deadline ? formatRelative(row.original.deadline) : '—' }}
            </p>
            <p v-if="row.original.deadline" class="text-[11px] text-dimmed">
              {{ formatDate(row.original.deadline) }}
            </p>
          </template>

          <template #totalPrice-cell="{ row }">
            <span class="tabular-nums text-sm font-medium text-highlighted">
              {{ formatMoney(row.original.totalPrice, false) }}
            </span>
          </template>

          <template #balanceDue-cell="{ row }">
            <span
              class="tabular-nums text-sm"
              :class="row.original.balanceDue > 0 ? 'text-warning font-medium' : 'text-success'"
            >
              {{ row.original.balanceDue > 0 ? formatMoney(row.original.balanceDue, false) : $t('dashboard.paid') }}
            </span>
          </template>

          <template #actions-cell="{ row }">
            <!-- Stop the click from bubbling into the row's `select`. -->
            <div @click.stop>
              <UDropdownMenu :items="rowActions(row.original)" :content="{ align: 'end' }">
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  square
                  :aria-label="$t('common.actions')"
                />
              </UDropdownMenu>
            </div>
          </template>
        </UTable>
      </UCard>

      <div v-if="(data?.pages ?? 1) > 1" class="flex justify-center mt-4">
        <UPagination
          v-model:page="filters.page"
          :total="data?.total ?? 0"
          :items-per-page="data?.limit ?? 25"
        />
      </div>
    </div>
  </div>
</template>
