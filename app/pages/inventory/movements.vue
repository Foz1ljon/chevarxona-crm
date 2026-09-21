<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { StockMovement } from '~/composables/useInventory'

definePageMeta({ permission: 'inventory:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.movements') })

const route = useRoute()
const { movements } = useInventory()
const { formatQty, formatDateTime } = useFormat()
const { movementType } = useLabels()

const filters = reactive({
  material: (route.query.material as string) || undefined,
  type: undefined as string | undefined,
  page: 1
})

const query = computed(() => ({
  page: filters.page,
  limit: 50,
  material: filters.material,
  type: filters.type
}))

const { data, pending } = await movements(query)

watch(() => filters.type, () => { filters.page = 1 })

/** Ledger entries are immutable, so the visual language is purely directional. */
const movementMeta: Record<string, { color: string, icon: string }> = {
  INTAKE: { color: 'success', icon: 'i-lucide-package-plus' },
  ADJUSTMENT: { color: 'info', icon: 'i-lucide-clipboard-check' },
  RESERVE: { color: 'secondary', icon: 'i-lucide-lock' },
  RELEASE: { color: 'neutral', icon: 'i-lucide-unlock' },
  CONSUME: { color: 'warning', icon: 'i-lucide-scissors' },
  RETURN: { color: 'success', icon: 'i-lucide-undo-2' }
}

const right = { class: { th: 'text-right', td: 'text-right' } }

const columns = computed<TableColumn<StockMovement>[]>(() => [
  { accessorKey: 'createdAt', header: t('common.when') },
  { accessorKey: 'type', header: t('movements.movement') },
  { accessorKey: 'materialName', header: t('movements.material') },
  { accessorKey: 'quantity', header: t('common.quantity'), meta: right },
  { accessorKey: 'balanceAfter', header: t('movements.balance'), meta: right },
  { accessorKey: 'orderNumber', header: t('orders.order') },
  { accessorKey: 'performedByName', header: t('common.by') }
])
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.movements')"
      :description="$t('movements.subtitle')"
      icon="i-lucide-arrow-left-right"
    >
      <template #actions>
        <UButton to="/inventory" icon="i-lucide-layers" color="neutral" variant="subtle">
          {{ $t('movements.backToInventory') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2" data-tour="movements-filters">
        <USelect
          v-model="filters.type"
          :items="[
            { label: $t('movements.allMovements'), value: undefined },
            ...Object.keys(movementMeta).map(value => ({ label: movementType(value), value }))
          ]"
          class="w-44"
        />

        <UButton
          v-if="filters.material"
          icon="i-lucide-filter-x"
          size="sm"
          variant="subtle"
          color="neutral"
          @click="filters.material = undefined"
        >
          {{ $t('movements.clearMaterialFilter') }}
        </UButton>
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0 sm:p-0' }" data-tour="movements-table">
        <UTable
          :data="data?.items ?? []"
          :columns="columns"
          :loading="pending"
          sticky="header"
          :empty="$t('movements.none')"
        >
          <template #createdAt-cell="{ row }">
            <span class="text-sm text-muted whitespace-nowrap">
              {{ formatDateTime(row.original.createdAt) }}
            </span>
          </template>

          <template #type-cell="{ row }">
            <UBadge
              :label="movementType(row.original.type)"
              :icon="movementMeta[row.original.type]?.icon"
              :color="(movementMeta[row.original.type]?.color ?? 'neutral') as never"
              variant="subtle"
              size="sm"
            />
          </template>

          <template #materialName-cell="{ row }">
            <p class="text-sm text-highlighted truncate max-w-[16rem]">
              {{ row.original.materialName }}
            </p>
            <p class="text-[11px] text-dimmed">
              {{ row.original.materialType === 'FABRIC' ? $t('inventory.fabric') : $t('inventory.accessory') }}
            </p>
          </template>

          <template #quantity-cell="{ row }">
            <span
              class="tabular-nums text-sm font-medium"
              :class="row.original.quantity < 0 ? 'text-error' : 'text-success'"
            >
              {{ row.original.quantity > 0 ? '+' : '' }}{{ formatQty(row.original.quantity, row.original.unit) }}
            </span>
          </template>

          <template #balanceAfter-cell="{ row }">
            <span class="tabular-nums text-sm text-toned">
              {{ formatQty(row.original.balanceAfter, row.original.unit) }}
            </span>
          </template>

          <template #orderNumber-cell="{ row }">
            <span v-if="!row.original.orderNumber" class="text-sm text-dimmed">—</span>
            <span v-else class="font-mono text-xs text-primary">{{ row.original.orderNumber }}</span>
            <p v-if="row.original.reason" class="text-[11px] text-dimmed truncate max-w-[14rem]">
              {{ row.original.reason }}
            </p>
          </template>

          <template #performedByName-cell="{ row }">
            <span class="text-sm text-muted">{{ row.original.performedByName }}</span>
          </template>
        </UTable>
      </UCard>

      <div v-if="(data?.pages ?? 1) > 1" class="flex justify-center mt-4">
        <UPagination
          v-model:page="filters.page"
          :total="data?.total ?? 0"
          :items-per-page="50"
        />
      </div>
    </div>
  </div>
</template>
