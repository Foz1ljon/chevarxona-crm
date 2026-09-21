<script setup lang="ts">
const props = defineProps<{
  trend: Array<{ label: string, revenue: number, payments: number }>
}>()

const { formatMoneyCompact, formatMoney, formatMonthShort } = useFormat()

const max = computed(() => Math.max(1, ...props.trend.map(point => point.revenue)))

const totalCollected = computed(() => props.trend.reduce((sum, point) => sum + point.revenue, 0))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ $t('dashboard.paymentsCollected') }}
          </h2>
          <p class="text-xs text-muted mt-0.5">
            {{ $t('dashboard.last6Months') }}
          </p>
        </div>
        <p class="text-sm font-semibold text-highlighted tabular-nums">
          {{ formatMoneyCompact(totalCollected) }}
        </p>
      </div>
    </template>

    <SharedEmptyState
      v-if="!trend.length"
      icon="i-lucide-chart-column"
      :title="$t('dashboard.noPayments')"
      :description="$t('dashboard.noPaymentsHint')"
      compact
    />

    <div v-else class="flex items-end gap-2 sm:gap-3 h-40" role="img" :aria-label="$t('dashboard.paymentsCollected')">
      <div
        v-for="point in trend"
        :key="point.label"
        class="flex-1 flex flex-col items-center gap-2 min-w-0 h-full justify-end"
      >
        <UTooltip :text="`${formatMoney(point.revenue)} · ${$t('dashboard.paymentsReceived', { n: point.payments })}`">
          <div
            class="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
            :style="{ height: `${Math.max(4, (point.revenue / max) * 128)}px` }"
          />
        </UTooltip>
        <span class="text-[10px] text-muted truncate w-full text-center">
          {{ formatMonthShort(point.label) }}
        </span>
      </div>
    </div>
  </UCard>
</template>
