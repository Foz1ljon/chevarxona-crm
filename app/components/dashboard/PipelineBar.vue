<script setup lang="ts">
import type { OrderStatus } from '#shared/utils/orderStatus'

const props = defineProps<{
  pipeline: Array<{ status: OrderStatus, count: number, value: number }>
}>()

const { formatMoneyCompact } = useFormat()
const { orderStatus } = useLabels()

const total = computed(() => props.pipeline.reduce((sum, lane) => sum + lane.count, 0))

/** Lanes with zero orders are dropped so the bar stays readable. */
const segments = computed(() =>
  props.pipeline
    .filter(lane => lane.count > 0)
    .map(lane => ({
      ...lane,
      meta: orderStatus(lane.status),
      percent: total.value ? (lane.count / total.value) * 100 : 0
    }))
)

const toneBar: Record<string, string> = {
  neutral: 'bg-neutral-400 dark:bg-neutral-500',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error'
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-highlighted">
            {{ $t('dashboard.pipeline') }}
          </h2>
          <p class="text-xs text-muted mt-0.5">
            {{ $t('dashboard.inProduction', { n: total }) }}
          </p>
        </div>
        <UButton to="/orders" size="xs" variant="ghost" color="neutral" trailing-icon="i-lucide-arrow-right">
          {{ $t('dashboard.board') }}
        </UButton>
      </div>
    </template>

    <div v-if="!total">
      <SharedEmptyState
        icon="i-lucide-columns-3"
        :title="$t('dashboard.pipelineEmpty')"
        :description="$t('dashboard.pipelineEmptyHint')"
        compact
      />
    </div>

    <div v-else class="space-y-4">
      <div class="flex h-2.5 rounded-full overflow-hidden bg-elevated gap-0.5">
        <UTooltip
          v-for="segment in segments"
          :key="segment.status"
          :text="`${segment.meta.label}: ${segment.count}`"
        >
          <div
            class="h-full first:rounded-l-full last:rounded-r-full transition-all"
            :class="toneBar[segment.meta.color]"
            :style="{ width: `${segment.percent}%`, minWidth: '6px' }"
          />
        </UTooltip>
      </div>

      <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        <li
          v-for="segment in segments"
          :key="segment.status"
          class="flex items-center gap-2 py-1.5 text-sm"
        >
          <span class="size-2 rounded-full shrink-0" :class="toneBar[segment.meta.color]" />
          <NuxtLink
            :to="`/orders/list?status=${segment.status}`"
            class="flex-1 min-w-0 truncate text-toned hover:text-primary transition-colors"
          >
            {{ segment.meta.label }}
          </NuxtLink>
          <span class="tabular-nums font-medium text-highlighted">{{ segment.count }}</span>
          <span class="tabular-nums text-xs text-dimmed w-16 text-right">
            {{ formatMoneyCompact(segment.value) }}
          </span>
        </li>
      </ul>
    </div>
  </UCard>
</template>
