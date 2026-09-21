<script setup lang="ts">
interface BoardOrder {
  _id: string
  orderNumber: string
  clientName: string
  clientPhone: string
  status: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  fittingDate: string | null
  deadline: string | null
  totalPrice: number
  balanceDue: number
  itemCount: number
  garments: string[]
  tailors: string[]
}

const props = defineProps<{ order: BoardOrder, draggable?: boolean }>()
const emit = defineEmits<{ dragstart: [DragEvent], dragend: [] }>()

const { formatMoneyCompact, formatRelative, daysUntil, initials } = useFormat()
const { priority } = useLabels()

const overdue = computed(() => {
  const days = daysUntil(props.order.deadline)
  return days !== null && days < 0
})

const dueSoon = computed(() => {
  const days = daysUntil(props.order.deadline)
  return days !== null && days >= 0 && days <= 2
})

const priorityTone: Record<string, string> = {
  URGENT: 'bg-error',
  HIGH: 'bg-warning',
  NORMAL: 'bg-transparent',
  LOW: 'bg-transparent'
}

/** De-duplicated tailor initials, empty slots dropped. */
const tailors = computed(() => [...new Set(props.order.tailors.filter(Boolean))])
const garments = computed(() => [...new Set(props.order.garments.filter(Boolean))])
</script>

<template>
  <div
    :draggable="draggable"
    class="group relative rounded-lg bg-default ring ring-default p-3 transition-all"
    :class="[
      draggable ? 'cursor-grab active:cursor-grabbing hover:ring-accented hover:shadow-sm' : '',
      overdue ? 'ring-error/40' : ''
    ]"
    @dragstart="emit('dragstart', $event)"
    @dragend="emit('dragend')"
  >
    <!-- Priority rail -->
    <span
      v-if="order.priority === 'URGENT' || order.priority === 'HIGH'"
      class="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
      :class="priorityTone[order.priority]"
      :aria-label="`${priority(order.priority)} — ${$t('priority.label')}`"
    />

    <NuxtLink :to="`/orders/${order._id}`" class="block space-y-2">
      <div class="flex items-start justify-between gap-2">
        <span class="font-mono text-[11px] text-muted">{{ order.orderNumber }}</span>
        <UBadge
          v-if="order.priority === 'URGENT'"
          :label="$t('priority.URGENT')"
          color="error"
          variant="subtle"
          size="sm"
        />
      </div>

      <div>
        <p class="text-sm font-medium text-highlighted truncate group-hover:text-primary transition-colors">
          {{ order.clientName }}
        </p>
        <p v-if="garments.length" class="text-xs text-muted truncate mt-0.5">
          {{ garments.join(', ') }}
          <span v-if="order.itemCount > garments.length"> +{{ order.itemCount - garments.length }}</span>
        </p>
      </div>

      <div class="flex items-center justify-between gap-2 pt-0.5">
        <div class="flex items-center gap-1.5 min-w-0">
          <UIcon
            name="i-lucide-calendar"
            class="size-3.5 shrink-0"
            :class="overdue ? 'text-error' : dueSoon ? 'text-warning' : 'text-dimmed'"
          />
          <span
            class="text-[11px] truncate"
            :class="overdue ? 'text-error font-medium' : dueSoon ? 'text-warning' : 'text-muted'"
          >
            {{ order.deadline ? formatRelative(order.deadline) : $t('orders.noDeadline') }}
          </span>
        </div>

        <span class="text-[11px] font-medium text-highlighted tabular-nums shrink-0">
          {{ formatMoneyCompact(order.totalPrice) }}
        </span>
      </div>

      <div v-if="tailors.length || order.balanceDue > 0" class="flex items-center justify-between gap-2 pt-1 border-t border-default">
        <div class="flex -space-x-1.5">
          <UTooltip v-for="name in tailors.slice(0, 3)" :key="name" :text="name">
            <span
              class="size-5 rounded-full bg-elevated ring-2 ring-default flex items-center justify-center text-[9px] font-semibold text-toned"
            >
              {{ initials(name) }}
            </span>
          </UTooltip>
          <span
            v-if="tailors.length > 3"
            class="size-5 rounded-full bg-elevated ring-2 ring-default flex items-center justify-center text-[9px] text-muted"
          >
            +{{ tailors.length - 3 }}
          </span>
        </div>

        <span v-if="order.balanceDue > 0" class="text-[11px] text-warning tabular-nums">
          {{ $t('dashboard.due', { amount: formatMoneyCompact(order.balanceDue) }) }}
        </span>
      </div>
    </NuxtLink>
  </div>
</template>
