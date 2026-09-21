<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface ActivityEntry {
  _id: string
  actorName: string
  actorRole: string
  action: string
  entity: string
  entityId: string
  summary: string
  meta: Record<string, unknown>
  ip: string
  createdAt: string
}

definePageMeta({ permission: 'logs:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.activityLog') })

const { formatDateTime, initials } = useFormat()
const { role } = useLabels()

const filters = reactive({
  search: '',
  entity: undefined as string | undefined,
  page: 1
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const { data, pending } = await useFetch<{ items: ActivityEntry[], total: number, pages: number }>(
  '/api/settings/activity',
  {
    query: computed(() => ({
      page: filters.page,
      limit: 50,
      search: debounced.value || undefined,
      entity: filters.entity
    })),
    default: () => ({ items: [], total: 0, pages: 1 })
  }
)

watch([debounced, () => filters.entity], () => { filters.page = 1 })

/** Icon + tone per action family, so the log scans quickly. */
function actionMeta(action: string) {
  if (action.startsWith('auth.')) return { icon: 'i-lucide-log-in', color: 'info' }
  if (action.includes('delete') || action.includes('deactivate')) return { icon: 'i-lucide-trash-2', color: 'error' }
  if (action.includes('create')) return { icon: 'i-lucide-plus', color: 'success' }
  if (action.includes('status')) return { icon: 'i-lucide-git-branch', color: 'secondary' }
  if (action.includes('payment')) return { icon: 'i-lucide-banknote', color: 'success' }
  if (action.startsWith('inventory.')) return { icon: 'i-lucide-package', color: 'warning' }
  return { icon: 'i-lucide-pencil', color: 'neutral' }
}

const columns = computed<TableColumn<ActivityEntry>[]>(() => [
  { accessorKey: 'createdAt', header: t('common.when') },
  { accessorKey: 'actorName', header: t('common.who') },
  { accessorKey: 'action', header: t('activity.action') },
  { accessorKey: 'summary', header: t('common.detail') },
  { accessorKey: 'ip', header: 'IP' }
])

const entities = ['Order', 'Client', 'Fabric', 'Accessory', 'User', 'Role', 'GarmentCategory']
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.activityLog')"
      :description="$t('activity.events', { n: data?.total ?? 0 })"
      icon="i-lucide-history"
    >
      <div class="flex flex-wrap items-center gap-2" data-tour="activity-filters">
        <UInput v-model="filters.search" icon="i-lucide-search" :placeholder="$t('activity.searchPlaceholder')" class="w-full sm:w-72" />
        <USelect
          v-model="filters.entity"
          :items="[{ label: $t('activity.allRecords'), value: undefined }, ...entities.map(value => ({ label: $t(`entity.${value}`), value }))]"
          class="w-44"
        />
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0 sm:p-0' }" data-tour="activity-table">
        <UTable
          :data="data?.items ?? []"
          :columns="columns"
          :loading="pending"
          sticky="header"
          :empty="$t('activity.none')"
        >
          <template #createdAt-cell="{ row }">
            <span class="text-sm text-muted whitespace-nowrap">{{ formatDateTime(row.original.createdAt) }}</span>
          </template>

          <template #actorName-cell="{ row }">
            <div class="flex items-center gap-2">
              <span class="size-6 rounded-full bg-elevated flex items-center justify-center text-[10px] font-semibold text-toned shrink-0">
                {{ initials(row.original.actorName) }}
              </span>
              <div class="min-w-0">
                <p class="text-sm text-highlighted truncate">
                  {{ row.original.actorName }}
                </p>
                <p class="text-[11px] text-dimmed">
                  {{ role(row.original.actorRole).label }}
                </p>
              </div>
            </div>
          </template>

          <template #action-cell="{ row }">
            <UBadge
              :label="row.original.action"
              :icon="actionMeta(row.original.action).icon"
              :color="actionMeta(row.original.action).color as never"
              variant="subtle"
              size="sm"
              class="font-mono"
            />
          </template>

          <template #summary-cell="{ row }">
            <p class="text-sm text-toned">
              {{ row.original.summary }}
            </p>
          </template>

          <template #ip-cell="{ row }">
            <span class="text-xs text-dimmed font-mono">{{ row.original.ip || '—' }}</span>
          </template>
        </UTable>
      </UCard>

      <div v-if="(data?.pages ?? 1) > 1" class="flex justify-center mt-4">
        <UPagination v-model:page="filters.page" :total="data?.total ?? 0" :items-per-page="50" />
      </div>
    </div>
  </div>
</template>
