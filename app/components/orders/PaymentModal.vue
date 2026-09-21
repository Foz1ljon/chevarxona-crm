<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ orderId: string, orderNumber: string, balanceDue: number }>()
const emit = defineEmits<{ saved: [] }>()

const { addPayment } = useOrders()
const { formatMoney } = useFormat()
const toast = useApiToast()
const { t } = useI18n()

const amount = ref(0)
const method = ref<'CASH' | 'CARD' | 'TRANSFER' | 'OTHER'>('CASH')
const note = ref('')
const pending = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  amount.value = props.balanceDue
  method.value = 'CASH'
  note.value = ''
})

const valid = computed(() => amount.value > 0 && amount.value <= props.balanceDue)

async function save() {
  pending.value = true
  try {
    await addPayment(props.orderId, { amount: amount.value, method: method.value, note: note.value })
    emit('saved')
    open.value = false
  } catch (error) {
    toast.error(error, t('orders.paymentFailed'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('orders.paymentTitle')"
    :description="$t('orders.paymentBody', { order: orderNumber, amount: formatMoney(balanceDue) })"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField :label="$t('orders.amount')" required>
          <UInputNumber v-model="amount" :min="0" :max="balanceDue" :step="10000" class="w-full" size="lg" />
        </UFormField>

        <div class="flex gap-2">
          <UButton
            v-for="preset in [0.25, 0.5, 1]"
            :key="preset"
            size="xs"
            variant="subtle"
            color="neutral"
            @click="() => { amount = Math.round(balanceDue * preset) }"
          >
            {{ preset === 1 ? $t('orders.fullBalance') : `${preset * 100}%` }}
          </UButton>
        </div>

        <UFormField :label="$t('orders.method')">
          <USelect
            v-model="method"
            :items="[
              { label: $t('orders.methodCash'), value: 'CASH' },
              { label: $t('orders.methodCard'), value: 'CARD' },
              { label: $t('orders.methodTransfer'), value: 'TRANSFER' },
              { label: $t('orders.methodOther'), value: 'OTHER' }
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('common.note')" :hint="$t('common.optional')">
          <UInput v-model="note" :placeholder="$t('orders.paymentNotePlaceholder')" class="w-full" />
        </UFormField>

        <div class="flex items-center justify-between text-sm pt-2 border-t border-default">
          <span class="text-muted">{{ $t('orders.remainingAfter') }}</span>
          <span class="tabular-nums font-semibold text-highlighted">
            {{ formatMoney(Math.max(0, balanceDue - amount)) }}
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton icon="i-lucide-banknote" :loading="pending" :disabled="!valid" @click="save">
          {{ $t('orders.recordPayment') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
