<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Fabric, Accessory, MaterialBase } from '~/composables/useInventory'

const props = defineProps<{
  type: 'FABRIC' | 'ACCESSORY'
  /** Distinct values for the type/category filter. */
  typeOptions: string[]
  autoIntake?: boolean
}>()

const auth = useAuthStore()
const inventory = useInventory()
const { formatMoney, formatQty } = useFormat()
const toast = useApiToast()
const { t } = useI18n()

const isFabric = computed(() => props.type === 'FABRIC')

const route = useRoute()

const filters = reactive({
  search: '',
  stock: (route.query.stock as string) || 'all',
  type: undefined as string | undefined,
  active: 'true' as 'true' | 'false' | 'all',
  page: 1
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const query = computed(() => ({
  page: filters.page,
  limit: 25,
  search: debounced.value || undefined,
  stock: filters.stock,
  type: filters.type,
  active: filters.active,
  sort: 'name',
  dir: 'asc' as const
}))

const { data, pending, refresh } = isFabric.value
  ? await inventory.fabrics(query)
  : await inventory.accessories(query)

watch([debounced, () => filters.stock, () => filters.type, () => filters.active], () => { filters.page = 1 })

/* ---- Modals ----------------------------------------------------------- */

const formOpen = ref(false)
const editing = ref<Fabric | Accessory | null>(null)
const adjustOpen = ref(props.autoIntake ?? false)
const adjusting = ref<MaterialBase | null>(null)
const deleting = ref<MaterialBase | null>(null)
const deletePending = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(material: Fabric | Accessory) {
  editing.value = material
  formOpen.value = true
}

function openAdjust(material: MaterialBase) {
  adjusting.value = material
  adjustOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deletePending.value = true
  try {
    await inventory.remove(props.type, deleting.value._id)
    deleting.value = null
    await refresh()
  } catch (error) {
    toast.error(error, t('inventory.deactivateFailed'))
  } finally {
    deletePending.value = false
  }
}

/* ---- Table ------------------------------------------------------------ */

const right = { class: { th: 'text-right', td: 'text-right' } }

const columns = computed<TableColumn<MaterialBase>[]>(() => [
  { accessorKey: 'name', header: isFabric.value ? t('inventory.fabric') : t('inventory.accessory') },
  {
    accessorKey: isFabric.value ? 'fabricType' : 'category',
    header: isFabric.value ? t('inventory.type') : t('inventory.category')
  },
  { accessorKey: 'stockQty', header: t('inventory.onShelf'), meta: right },
  { accessorKey: 'reservedQty', header: t('inventory.reserved'), meta: right },
  { accessorKey: 'availableQty', header: t('inventory.available'), meta: right },
  { accessorKey: 'costPerUnit', header: t('common.cost'), meta: right },
  { accessorKey: 'location', header: t('inventory.shelf') },
  { id: 'actions', header: '', meta: { class: { th: 'w-10', td: 'w-10' } } }
])

const stockFilters = computed(() => [
  { label: t('inventory.allStock'), value: 'all' },
  { label: t('inventory.lowStock'), value: 'low' },
  { label: t('inventory.outOfStock'), value: 'out' },
  { label: t('inventory.inStock'), value: 'available' }
])

const typeFilterItems = computed(() => [
  { label: isFabric.value ? t('inventory.allTypes') : t('inventory.allCategories'), value: undefined },
  ...props.typeOptions.map(value => ({
    label: isFabric.value ? t(`fabricType.${value}`) : t(`accessoryCategory.${value}`),
    value
  }))
])

// The page owns the toolbar, so it drives the modals through this handle.
defineExpose({ openCreate, refresh })

function rowActions(material: MaterialBase) {
  return [[
    ...(auth.can(['inventory:adjust', 'inventory:manage'])
      ? [{ label: t('inventory.receiveCount'), icon: 'i-lucide-package-plus', onSelect: () => openAdjust(material) }]
      : []),
    ...(auth.can(['inventory:update', 'inventory:manage'])
      ? [{ label: t('inventory.editDetails'), icon: 'i-lucide-pencil', onSelect: () => openEdit(material as Fabric) }]
      : []),
    { label: t('inventory.movementHistory'), icon: 'i-lucide-history', to: `/inventory/movements?material=${material._id}` },
    ...(auth.can(['inventory:delete', 'inventory:manage'])
      ? [{ label: t('inventory.deactivate'), icon: 'i-lucide-archive', color: 'error' as const, onSelect: () => (deleting.value = material) }]
      : [])
  ]]
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2 mb-4" data-tour="material-filters">
      <UInput
        v-model="filters.search"
        icon="i-lucide-search"
        :placeholder="isFabric ? $t('inventory.searchFabric') : $t('inventory.searchAccessory')"
        class="w-full sm:w-72"
      />

      <USelect v-model="filters.stock" :items="stockFilters" class="w-36" />
      <USelect v-model="filters.type" :items="typeFilterItems" class="w-40" />
      <USelect
        v-model="filters.active"
        :items="[
          { label: $t('common.active'), value: 'true' },
          { label: $t('common.inactive'), value: 'false' },
          { label: $t('common.all'), value: 'all' }
        ]"
        class="w-32"
      />

      <div class="flex-1" />

      <div class="flex items-center gap-4 text-xs text-muted">
        <span>
          {{ $t('inventory.stockValue') }}
          <strong class="text-highlighted tabular-nums ml-1">
            {{ formatMoney(data?.summary?.stockValue ?? 0, false) }}
          </strong>
        </span>
        <span v-if="data?.summary?.lowStockCount" class="text-warning">
          {{ $t('inventory.belowThreshold', { n: data.summary.lowStockCount }) }}
        </span>
      </div>
    </div>

    <UCard :ui="{ body: 'p-0 sm:p-0' }" data-tour="material-table">
      <UTable
        :data="data?.items ?? []"
        :columns="columns"
        :loading="pending"
        sticky="header"
        :empty="isFabric ? $t('inventory.noFabrics') : $t('inventory.noAccessories')"
        :ui="{ tr: 'hover:bg-elevated/50' }"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-3">
            <span
              v-if="isFabric"
              class="size-8 rounded-md ring ring-default shrink-0"
              :style="{ backgroundColor: (row.original as Fabric).colorHex || '#94a3b8' }"
              :aria-label="(row.original as Fabric).color"
            />
            <span
              v-else
              class="size-8 rounded-md bg-elevated flex items-center justify-center shrink-0"
            >
              <UIcon name="i-lucide-scissors" class="size-4 text-dimmed" />
            </span>

            <div class="min-w-0">
              <p class="font-medium text-highlighted truncate max-w-[16rem]">
                {{ row.original.name }}
                <UBadge v-if="!row.original.isActive" :label="$t('common.inactive')" size="sm" variant="subtle" color="neutral" class="ml-1" />
              </p>
              <p class="text-[11px] text-dimmed font-mono">
                {{ row.original.sku }}
                <span v-if="row.original.supplier" class="font-sans"> · {{ row.original.supplier }}</span>
              </p>
            </div>
          </div>
        </template>

        <template #fabricType-cell="{ row }">
          <span class="text-sm text-toned">
            {{ $t(`fabricType.${(row.original as Fabric).fabricType}`) }}
          </span>
          <p v-if="(row.original as Fabric).pattern" class="text-[11px] text-dimmed">
            {{ (row.original as Fabric).pattern }}
          </p>
        </template>

        <template #category-cell="{ row }">
          <span class="text-sm text-toned">
            {{ $t(`accessoryCategory.${(row.original as Accessory).category}`) }}
          </span>
          <p v-if="(row.original as Accessory).size" class="text-[11px] text-dimmed">
            {{ (row.original as Accessory).size }}
          </p>
        </template>

        <template #stockQty-cell="{ row }">
          <span class="tabular-nums text-sm text-toned">
            {{ formatQty(row.original.stockQty, row.original.unit) }}
          </span>
        </template>

        <template #reservedQty-cell="{ row }">
          <span
            class="tabular-nums text-sm"
            :class="row.original.reservedQty > 0 ? 'text-warning' : 'text-dimmed'"
          >
            {{ row.original.reservedQty > 0 ? formatQty(row.original.reservedQty) : '—' }}
          </span>
        </template>

        <template #availableQty-cell="{ row }">
          <div class="flex items-center justify-end gap-1.5">
            <UIcon
              v-if="row.original.isLowStock"
              :name="row.original.availableQty <= 0 ? 'i-lucide-circle-x' : 'i-lucide-triangle-alert'"
              class="size-3.5"
              :class="row.original.availableQty <= 0 ? 'text-error' : 'text-warning'"
            />
            <span
              class="tabular-nums text-sm font-medium"
              :class="row.original.availableQty <= 0
                ? 'text-error'
                : row.original.isLowStock ? 'text-warning' : 'text-highlighted'"
            >
              {{ formatQty(row.original.availableQty, row.original.unit) }}
            </span>
          </div>
          <p class="text-[10px] text-dimmed text-right">
            {{ $t('inventory.min', { n: row.original.minThreshold }) }}
          </p>
        </template>

        <template #costPerUnit-cell="{ row }">
          <span class="tabular-nums text-sm text-toned">
            {{ formatMoney(row.original.costPerUnit, false) }}
          </span>
        </template>

        <template #location-cell="{ row }">
          <span class="text-sm text-muted font-mono">{{ row.original.location || '—' }}</span>
        </template>

        <template #actions-cell="{ row }">
          <UDropdownMenu :items="rowActions(row.original)">
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

    <InventoryMaterialFormModal
      v-model:open="formOpen"
      :type="type"
      :material="editing"
      @saved="refresh()"
    />

    <InventoryStockAdjustModal
      v-model:open="adjustOpen"
      :type="type"
      :material="adjusting"
      @saved="refresh()"
    />

    <SharedConfirmModal
      :open="Boolean(deleting)"
      :title="$t('inventory.deactivateTitle')"
      :description="$t('inventory.deactivateBody', { name: deleting?.name ?? '' })"
      :confirm-label="$t('inventory.deactivate')"
      :loading="deletePending"
      @update:open="value => !value && (deleting = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
