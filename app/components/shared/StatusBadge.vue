<script setup lang="ts">
import type { OrderStatus, OrderItemStatus } from '#shared/utils/orderStatus'

const props = withDefaults(defineProps<{
  status: OrderStatus | OrderItemStatus | string
  kind?: 'order' | 'item'
  size?: 'sm' | 'md' | 'lg'
  short?: boolean
  dot?: boolean
}>(), { kind: 'order', size: 'sm', short: false, dot: false })

const { orderStatus, itemStatus } = useLabels()

const meta = computed(() => {
  if (props.kind === 'item') return itemStatus(props.status as OrderItemStatus)

  const status = orderStatus(props.status as OrderStatus)
  return { ...status, label: props.short ? status.short : status.label }
})
</script>

<template>
  <UBadge
    :label="meta.label"
    :color="meta.color as never"
    :icon="dot ? undefined : meta.icon"
    variant="subtle"
    :size="size"
    class="whitespace-nowrap"
  >
    <template v-if="dot" #leading>
      <span class="size-1.5 rounded-full bg-current" />
    </template>
  </UBadge>
</template>
