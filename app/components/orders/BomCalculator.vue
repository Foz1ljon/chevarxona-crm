<script setup lang="ts">
interface BomLine {
  materialType: 'FABRIC' | 'ACCESSORY'
  material: string
  name?: string
  sku?: string
  unit?: string
  plannedQty: number
  unitCost?: number
  estimatedCost: number
  shortage: { required: number, available: number, missing: number } | null
}

const props = defineProps<{
  lines: BomLine[]
  shortages: Array<{ name: string, sku: string, unit: string, required: number, available: number, missing: number }>
  materialCost: number
  subtotal: number
  loading?: boolean
  canAllocate: boolean
}>()

const { formatMoney, formatQty } = useFormat()

const fabrics = computed(() => props.lines.filter(line => line.materialType === 'FABRIC'))
const accessories = computed(() => props.lines.filter(line => line.materialType === 'ACCESSORY'))

/** Gross margin on the material side — the number that decides whether a price holds. */
const margin = computed(() => {
  if (!props.subtotal) return null
  return Math.round(((props.subtotal - props.materialCost) / props.subtotal) * 100)
})
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-sm font-semibold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-calculator" class="size-4 text-primary" />
            {{ $t('bom.title') }}
          </h3>
          <p class="text-xs text-muted mt-0.5">
            {{ $t('bom.subtitle') }}
          </p>
        </div>

        <UBadge
          v-if="lines.length"
          :label="canAllocate ? $t('bom.inStock') : $t('bom.short')"
          :color="canAllocate ? 'success' : 'error'"
          variant="subtle"
          :icon="canAllocate ? 'i-lucide-check' : 'i-lucide-triangle-alert'"
        />
      </div>
    </template>

    <div v-if="loading" class="p-4 space-y-2">
      <USkeleton v-for="n in 4" :key="n" class="h-8 w-full" />
    </div>

    <SharedEmptyState
      v-else-if="!lines.length"
      icon="i-lucide-package-search"
      :title="$t('bom.noMaterials')"
      :description="$t('bom.noMaterialsHint')"
      compact
    />

    <template v-else>
      <div class="divide-y divide-default">
        <section v-if="fabrics.length">
          <p class="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-dimmed bg-elevated/40">
            {{ $t('bom.fabrics') }}
          </p>
          <ul class="divide-y divide-default">
            <li
              v-for="line in fabrics"
              :key="line.material"
              class="px-4 py-2.5 flex items-center gap-3"
              :class="line.shortage ? 'bg-error/5' : ''"
            >
              <UIcon
                name="i-lucide-layers"
                class="size-4 shrink-0"
                :class="line.shortage ? 'text-error' : 'text-dimmed'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted truncate">
                  {{ line.name }}
                </p>
                <p class="text-[11px] text-muted font-mono">
                  {{ line.sku }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm tabular-nums" :class="line.shortage ? 'text-error font-medium' : 'text-toned'">
                  {{ formatQty(line.plannedQty, line.unit) }}
                </p>
                <p v-if="line.shortage" class="text-[11px] text-error">
                  {{ $t('bom.shortBy', { qty: formatQty(line.shortage.missing, line.unit) }) }}
                </p>
                <p v-else class="text-[11px] text-dimmed tabular-nums">
                  {{ formatMoney(line.estimatedCost, false) }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <section v-if="accessories.length">
          <p class="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-dimmed bg-elevated/40">
            {{ $t('bom.accessoriesSupplies') }}
          </p>
          <ul class="divide-y divide-default">
            <li
              v-for="line in accessories"
              :key="line.material"
              class="px-4 py-2.5 flex items-center gap-3"
              :class="line.shortage ? 'bg-error/5' : ''"
            >
              <UIcon
                name="i-lucide-scissors"
                class="size-4 shrink-0"
                :class="line.shortage ? 'text-error' : 'text-dimmed'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted truncate">
                  {{ line.name }}
                </p>
                <p class="text-[11px] text-muted font-mono">
                  {{ line.sku }}
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="text-sm tabular-nums" :class="line.shortage ? 'text-error font-medium' : 'text-toned'">
                  {{ formatQty(line.plannedQty, line.unit) }}
                </p>
                <p v-if="line.shortage" class="text-[11px] text-error">
                  {{ $t('bom.shortBy', { qty: formatQty(line.shortage.missing, line.unit) }) }}
                </p>
                <p v-else class="text-[11px] text-dimmed tabular-nums">
                  {{ formatMoney(line.estimatedCost, false) }}
                </p>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div class="px-4 py-3 bg-elevated/40 border-t border-default space-y-1.5">
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">{{ $t('bom.materialCost') }}</span>
          <span class="tabular-nums font-medium text-highlighted">{{ formatMoney(materialCost) }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-muted">{{ $t('bom.orderSubtotal') }}</span>
          <span class="tabular-nums font-medium text-highlighted">{{ formatMoney(subtotal) }}</span>
        </div>
        <div v-if="margin !== null" class="flex items-center justify-between text-sm pt-1.5 border-t border-default">
          <span class="text-muted">{{ $t('bom.margin') }}</span>
          <span
            class="tabular-nums font-semibold"
            :class="margin < 40 ? 'text-warning' : 'text-success'"
          >{{ margin }}%</span>
        </div>
      </div>

      <UAlert
        v-if="shortages.length"
        icon="i-lucide-package-x"
        color="error"
        variant="subtle"
        class="rounded-none border-t border-default"
        :title="$t('bom.shortageTitle')"
        :description="$t('bom.shortageBody', { n: shortages.length })"
      />
    </template>
  </UCard>
</template>
