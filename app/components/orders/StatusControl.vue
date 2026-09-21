<script setup lang="ts">
import { ORDER_STATUSES, canTransition, stockPhase, type OrderStatus } from '#shared/utils/orderStatus'

const props = defineProps<{ orderId: string, status: OrderStatus }>()
const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const toast = useApiToast()
const { changeStatus } = useOrders()
const { orderStatus } = useLabels()
const { t } = useI18n()

const target = ref<OrderStatus | null>(null)
const note = ref('')
const pending = ref(false)

const allowed = computed(() =>
  ORDER_STATUSES.filter(status => canTransition(props.status, status))
)

/** Explains the stock side-effect of the move so it is never a surprise. */
const stockEffect = computed(() => {
  if (!target.value) return null
  const from = stockPhase(props.status)
  const to = stockPhase(target.value)
  if (from === to) return null

  if (from === 'none' && to === 'reserved') return { tone: 'info', text: t('orders.fxReserve') }
  if (from === 'reserved' && to === 'consumed') return { tone: 'warning', text: t('orders.fxConsume') }
  if (to === 'none' && from === 'reserved') return { tone: 'success', text: t('orders.fxRelease') }
  if (to === 'none' && from === 'consumed') return { tone: 'success', text: t('orders.fxReturn') }
  if (from === 'consumed' && to === 'reserved') return { tone: 'warning', text: t('orders.fxReReserve') }
  return null
})

async function apply() {
  if (!target.value) return
  pending.value = true
  try {
    await changeStatus(props.orderId, target.value, note.value)
    toast.success(t('orders.movedTo', { status: orderStatus(target.value).label }))
    target.value = null
    note.value = ''
    emit('changed')
  } catch (error) {
    toast.error(error, t('orders.statusChangeFailed'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UCard v-if="auth.can('orders:status_change')">
    <template #header>
      <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
        <UIcon name="i-lucide-git-branch" class="size-4 text-primary" />
        {{ $t('orders.advanceOrder') }}
      </h2>
    </template>

    <div v-if="!allowed.length" class="text-sm text-muted">
      {{ $t('orders.terminalState', { status: orderStatus(status).label }) }}
    </div>

    <div v-else class="space-y-3">
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="option in allowed"
          :key="option"
          :label="orderStatus(option).label"
          :icon="orderStatus(option).icon"
          size="sm"
          :color="target === option ? orderStatus(option).color : 'neutral'"
          :variant="target === option ? 'solid' : 'subtle'"
          @click="() => { target = target === option ? null : option }"
        />
      </div>

      <template v-if="target">
        <p class="text-xs text-muted">
          {{ orderStatus(target).description }}
        </p>

        <UAlert
          v-if="stockEffect"
          :color="stockEffect.tone as never"
          variant="subtle"
          icon="i-lucide-boxes"
          :description="stockEffect.text"
        />

        <UFormField :label="$t('common.note')" :hint="$t('orders.noteHint')">
          <UInput v-model="note" :placeholder="$t('orders.notePlaceholder')" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2">
          <UButton variant="ghost" color="neutral" size="sm" @click="() => { target = null }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton
            size="sm"
            icon="i-lucide-arrow-right"
            :loading="pending"
            @click="apply"
          >
            {{ $t('orders.moveTo', { status: orderStatus(target).label }) }}
          </UButton>
        </div>
      </template>
    </div>
  </UCard>
</template>
