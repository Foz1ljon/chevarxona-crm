<script setup lang="ts">
const auth = useAuthStore()
const { formatRelative, formatQty } = useFormat()

/**
 * Operational alerts pulled on demand. Nothing here is a notification record —
 * it is the live state of the workshop, so it never needs to be marked read.
 */
const canSeeStock = computed(() => auth.can('inventory:read'))

const { data: lowStock } = await useFetch('/api/inventory/low-stock', {
  immediate: canSeeStock.value,
  default: () => ({ items: [], total: 0, outOfStock: 0 })
})

const { data: agenda } = await useFetch('/api/dashboard/agenda', {
  query: { days: 3 },
  default: () => ({ entries: [] as Array<{ type: string, date: string, order: Record<string, unknown> }> })
})

const urgent = computed(() => {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return (agenda.value?.entries ?? []).filter(entry => new Date(entry.date) <= today)
})

const count = computed(() => (lowStock.value?.total ?? 0) + urgent.value.length)
</script>

<template>
  <UPopover :content="{ align: 'end' }">
    <!-- The count has to be readable at a glance from across the workshop,
         so the chip runs larger than the Nuxt UI default. -->
    <UChip
      :show="count > 0"
      :text="count > 99 ? '99+' : count"
      size="3xl"
      color="error"
      :ui="{ base: 'text-[11px] font-semibold tabular-nums ring-2 ring-default' }"
    >
      <UButton
        icon="i-lucide-bell"
        color="neutral"
        variant="ghost"
        square
        :aria-label="count ? $t('notif.ariaCount', { n: count }) : $t('notif.aria')"
      />
    </UChip>

    <template #content>
      <div class="w-80 sm:w-96 max-h-[28rem] overflow-y-auto divide-y divide-default">
        <div class="px-4 py-3 flex items-center justify-between sticky top-0 bg-default z-10">
          <p class="text-sm font-semibold text-highlighted">
            {{ $t('notif.title') }}
          </p>
          <UBadge v-if="count" :label="String(count)" color="error" variant="subtle" size="sm" />
        </div>

        <div v-if="!count" class="px-4 py-10 text-center">
          <UIcon name="i-lucide-check-check" class="size-8 text-success mx-auto mb-2" />
          <p class="text-sm text-muted">
            {{ $t('notif.allClear') }}
          </p>
        </div>

        <template v-else>
          <div v-if="urgent.length" class="py-1">
            <p class="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-dimmed">
              {{ $t('notif.dueNow') }}
            </p>
            <NuxtLink
              v-for="entry in urgent.slice(0, 6)"
              :key="`${entry.type}-${entry.order._id}`"
              :to="`/orders/${entry.order._id}`"
              class="flex items-start gap-3 px-4 py-2.5 hover:bg-elevated transition-colors"
            >
              <UIcon
                :name="entry.type === 'FITTING' ? 'i-lucide-ruler' : 'i-lucide-alarm-clock'"
                class="size-4 mt-0.5 shrink-0"
                :class="entry.type === 'FITTING' ? 'text-info' : 'text-warning'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted truncate">
                  {{ entry.type === 'FITTING' ? $t('dashboard.fitting') : $t('orders.deadline') }} · {{ entry.order.clientName }}
                </p>
                <p class="text-xs text-muted">
                  {{ entry.order.orderNumber }} — {{ formatRelative(entry.date) }}
                </p>
              </div>
            </NuxtLink>
          </div>

          <div v-if="canSeeStock && lowStock?.items?.length" class="py-1">
            <p class="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-dimmed">
              {{ $t('notif.lowStock') }}
            </p>
            <NuxtLink
              v-for="item in lowStock.items.slice(0, 6)"
              :key="item._id"
              :to="item.materialType === 'FABRIC' ? '/inventory' : '/inventory/accessories'"
              class="flex items-start gap-3 px-4 py-2.5 hover:bg-elevated transition-colors"
            >
              <UIcon
                name="i-lucide-package-x"
                class="size-4 mt-0.5 shrink-0"
                :class="item.availableQty <= 0 ? 'text-error' : 'text-warning'"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-highlighted truncate">
                  {{ item.name }}
                </p>
                <p class="text-xs text-muted">
                  {{ $t('notif.freeReorder', { qty: formatQty(item.availableQty, item.unit), min: item.minThreshold }) }}
                </p>
              </div>
            </NuxtLink>

            <NuxtLink
              v-if="lowStock.total > 6"
              to="/inventory?stock=low"
              class="block px-4 py-2 text-xs text-primary hover:underline"
            >
              {{ $t('notif.viewAllLow', { n: lowStock.total }) }}
            </NuxtLink>
          </div>
        </template>
      </div>
    </template>
  </UPopover>
</template>
