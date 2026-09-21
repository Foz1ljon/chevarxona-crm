<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Client } from '~/composables/useClients'

definePageMeta({ permission: 'clients:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.clients') })

const route = useRoute()
const { list, remove } = useClients()
const { formatMoney, formatDate, initials } = useFormat()
const toast = useApiToast()

/** TanStack sorting state — one column at a time, newest first by default. */
const sorting = ref<Array<{ id: string, desc: boolean }>>([])

const filters = reactive({
  search: '',
  archived: 'false' as 'true' | 'false' | 'all',
  hasDebt: undefined as string | undefined,
  page: 1
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const query = computed(() => ({
  page: filters.page,
  limit: 25,
  search: debounced.value || undefined,
  archived: filters.archived,
  hasDebt: filters.hasDebt,
  sort: sorting.value[0]?.id ?? 'createdAt',
  dir: (sorting.value[0]?.desc === false ? 'asc' : 'desc') as 'asc' | 'desc'
}))

watch(sorting, () => { filters.page = 1 })

const { data, pending, refresh } = await list(query)

watch([debounced, () => filters.archived, () => filters.hasDebt], () => { filters.page = 1 })

/* ---- Modals ----------------------------------------------------------- */

const formOpen = ref(route.query.new === '1')
const editing = ref<Client | null>(null)
const deleting = ref<Client | null>(null)
const deletePending = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(client: Client) {
  editing.value = client
  formOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deletePending.value = true
  try {
    await remove(deleting.value._id)
    deleting.value = null
    await refresh()
  } catch (error) {
    toast.error(error, t('clients.removeFailed'))
  } finally {
    deletePending.value = false
  }
}

const right = { class: { th: 'text-right', td: 'text-right' } }

const columns = computed<TableColumn<Client>[]>(() => [
  { accessorKey: 'fullName', header: t('orders.client') },
  { accessorKey: 'phone', header: t('clients.contact'), enableSorting: false },
  { accessorKey: 'totalOrders', header: t('clients.ordersCol'), meta: right },
  { accessorKey: 'totalSpent', header: t('clients.spent'), meta: right },
  { accessorKey: 'debtBalance', header: t('orders.balance'), meta: right },
  { accessorKey: 'lastOrderAt', header: t('clients.lastOrder') },
  { id: 'actions', header: '', enableSorting: false, meta: { class: { th: 'w-10', td: 'w-10' } } }
])
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.clients')"
      :description="filters.archived === 'true'
        ? $t('clients.countArchived', { n: data?.total ?? 0 })
        : $t('clients.countActive', { n: data?.total ?? 0 })"
      icon="i-lucide-users"
    >
      <template #actions>
        <UButton v-if="$can('clients:create')" icon="i-lucide-user-plus" data-tour="clients-new" @click="openCreate">
          {{ $t('clients.newClient') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2">
        <UInput
          v-model="filters.search"
          icon="i-lucide-search"
          :placeholder="$t('clients.searchPlaceholder')"
          class="w-full sm:w-72"
          data-tour="clients-search"
        />

        <UButton
          :variant="filters.hasDebt === 'true' ? 'solid' : 'subtle'"
          :color="filters.hasDebt === 'true' ? 'warning' : 'neutral'"
          icon="i-lucide-hand-coins"
          size="sm"
          @click="() => { filters.hasDebt = filters.hasDebt === 'true' ? undefined : 'true' }"
        >
          {{ $t('clients.withBalance') }}
        </UButton>

        <USelect
          v-model="filters.archived"
          :items="[
            { label: $t('common.active'), value: 'false' },
            { label: $t('common.archived'), value: 'true' },
            { label: $t('common.all'), value: 'all' }
          ]"
          class="w-32"
        />
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0 sm:p-0' }" data-tour="clients-table">
        <UTable
          v-model:sorting="sorting"
          :data="data?.items ?? []"
          :columns="columns"
          :loading="pending"
          sticky="header"
          :empty="$t('clients.noneMatch')"
          :ui="{ tr: 'hover:bg-elevated/50' }"
        >
          <template #fullName-cell="{ row }">
            <NuxtLink :to="`/clients/${row.original._id}`" class="flex items-center gap-3 group">
              <span
                class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0"
              >
                {{ initials(row.original.fullName) }}
              </span>
              <div class="min-w-0">
                <p class="font-medium text-highlighted truncate group-hover:text-primary transition-colors">
                  {{ row.original.fullName }}
                </p>
                <p v-if="row.original.measurementProfiles" class="text-[11px] text-dimmed">
                  {{ $t('clients.profilesCount', { n: row.original.measurementProfiles }) }}
                </p>
              </div>
            </NuxtLink>
          </template>

          <template #phone-cell="{ row }">
            <p class="text-sm text-toned">
              {{ row.original.phone }}
            </p>
            <p v-if="row.original.telegramId" class="text-[11px] text-dimmed">
              {{ row.original.telegramId }}
            </p>
          </template>

          <template #totalOrders-cell="{ row }">
            <span class="tabular-nums text-sm text-toned">{{ row.original.totalOrders }}</span>
          </template>

          <template #totalSpent-cell="{ row }">
            <span class="tabular-nums text-sm text-toned">{{ formatMoney(row.original.totalSpent, false) }}</span>
          </template>

          <template #debtBalance-cell="{ row }">
            <span
              class="tabular-nums text-sm"
              :class="row.original.debtBalance > 0 ? 'text-warning font-medium' : 'text-dimmed'"
            >
              {{ row.original.debtBalance > 0 ? formatMoney(row.original.debtBalance, false) : '—' }}
            </span>
          </template>

          <template #lastOrderAt-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.lastOrderAt) }}</span>
          </template>

          <template #actions-cell="{ row }">
            <UDropdownMenu
              :items="[[
                { label: $t('clients.openProfile'), icon: 'i-lucide-external-link', to: `/clients/${row.original._id}` },
                ...(useAuthStore().can('clients:update')
                  ? [{ label: $t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(row.original) }]
                  : []),
                ...(useAuthStore().can('clients:delete')
                  ? [{ label: $t('common.remove'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => (deleting = row.original) }]
                  : [])
              ]]"
            >
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" square />
            </UDropdownMenu>
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

    <ClientsClientFormModal
      v-model:open="formOpen"
      :client="editing"
      @saved="refresh()"
    />

    <SharedConfirmModal
      :open="Boolean(deleting)"
      :title="$t('clients.removeTitle')"
      :description="$t('clients.removeBody', { name: deleting?.fullName ?? '' })"
      :confirm-label="$t('common.remove')"
      :loading="deletePending"
      @update:open="value => !value && (deleting = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
