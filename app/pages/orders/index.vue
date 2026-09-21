<script setup lang="ts">
definePageMeta({ permission: ['orders:read', 'orders:read_assigned'] })
const { t } = useI18n()
useHead({ title: () => t('orders.boardTitle') })

const auth = useAuthStore()
const { board } = useOrders()
const { tailors } = useStaff()

type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

const filters = reactive({
  search: '',
  tailor: undefined as string | undefined,
  priority: undefined as OrderPriority | undefined
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const query = computed(() => ({
  search: debounced.value || undefined,
  tailor: filters.tailor,
  priority: filters.priority
}))

const { data, pending, refresh } = await board(query)
const { data: tailorList } = auth.can('orders:assign') ? await tailors() : { data: ref({ items: [] }) }

const tailorOptions = computed(() => [
  { label: t('orders.allTailors'), value: undefined },
  ...(tailorList.value?.items ?? []).map(tailor => ({ label: tailor.fullName, value: tailor._id }))
])

const priorityOptions = computed<Array<{ label: string, value: OrderPriority | undefined }>>(() => [
  { label: t('priority.any'), value: undefined },
  ...(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map(value => ({ label: t(`priority.${value}`), value }))
])

const totalOrders = computed(() => (data.value?.lanes ?? []).reduce((sum, lane) => sum + lane.count, 0))
const hasFilters = computed(() => Boolean(filters.search || filters.tailor || filters.priority))

function clearFilters() {
  filters.search = ''
  filters.tailor = undefined
  filters.priority = undefined
}
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-4rem)]">
    <SharedPageHeader
      :title="$t('orders.boardTitle')"
      :description="auth.can('orders:status_change')
        ? $t('orders.boardDragHint')
        : $t('orders.boardReadHint')"
      icon="i-lucide-columns-3"
    >
      <template #actions>
        <UButton to="/orders/list" icon="i-lucide-list" color="neutral" variant="subtle">
          {{ $t('orders.listView') }}
        </UButton>
        <UButton v-if="$can('orders:create')" to="/orders/new" icon="i-lucide-plus" data-tour="orders-new">
          {{ $t('header.newOrder') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2" data-tour="orders-filters">
        <UInput
          v-model="filters.search"
          icon="i-lucide-search"
          :placeholder="$t('orders.searchPlaceholder')"
          class="w-full sm:w-72"
          :ui="{ trailing: 'pe-1' }"
        >
          <template v-if="filters.search" #trailing>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="link"
              size="xs"
              :aria-label="$t('common.clear')"
              @click="() => { filters.search = '' }"
            />
          </template>
        </UInput>

        <USelect
          v-if="auth.can('orders:assign')"
          v-model="filters.tailor"
          :items="tailorOptions"
          :placeholder="$t('orders.allTailors')"
          icon="i-lucide-user"
          class="w-44"
        />

        <USelect
          v-model="filters.priority"
          :items="priorityOptions"
          :placeholder="$t('priority.any')"
          icon="i-lucide-flag"
          class="w-40"
        />

        <UButton
          v-if="hasFilters"
          icon="i-lucide-filter-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          {{ $t('common.clear') }}
        </UButton>

        <div class="flex-1" />

        <p class="text-xs text-muted tabular-nums">
          {{ $t('orders.ordersCount', { n: totalOrders }) }}
        </p>
      </div>
    </SharedPageHeader>

    <div class="flex-1 min-h-0 p-4 sm:p-6 overflow-hidden">
      <OrdersKanbanBoard
        :lanes="data?.lanes ?? []"
        :can-drag="data?.canDrag ?? false"
        :loading="pending"
        @moved="refresh()"
      />
    </div>
  </div>
</template>
