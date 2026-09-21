<script setup lang="ts">
import type { MaterialBase } from '~/composables/useInventory'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  type: 'FABRIC' | 'ACCESSORY'
  material: MaterialBase | null
}>()

const emit = defineEmits<{ saved: [] }>()

const { adjust } = useInventory()
const { formatQty, formatMoney } = useFormat()
const toast = useApiToast()
const { t } = useI18n()

const mode = ref<'INTAKE' | 'ADJUSTMENT'>('INTAKE')
const quantity = ref(0)
const unitCost = ref(0)
const reason = ref('')
const pending = ref(false)

watch(open, (isOpen) => {
  if (!isOpen || !props.material) return
  mode.value = 'INTAKE'
  quantity.value = 0
  unitCost.value = props.material.costPerUnit
  reason.value = ''
})

// A stock count cannot go below what open orders already hold.
const belowReserved = computed(() =>
  mode.value === 'ADJUSTMENT' && props.material
    ? quantity.value < props.material.reservedQty
    : false
)

const resulting = computed(() => {
  if (!props.material) return 0
  return mode.value === 'INTAKE'
    ? props.material.stockQty + quantity.value
    : quantity.value
})

const valid = computed(() => quantity.value >= 0 && !belowReserved.value && (mode.value === 'ADJUSTMENT' || quantity.value > 0))

async function save() {
  if (!props.material) return
  pending.value = true
  try {
    await adjust({
      materialType: props.type,
      material: props.material._id,
      mode: mode.value,
      quantity: quantity.value,
      unitCost: mode.value === 'INTAKE' ? unitCost.value : undefined,
      reason: reason.value
    })
    emit('saved')
    open.value = false
  } catch (error) {
    toast.error(error, t('inventory.adjustFailed'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="mode === 'INTAKE' ? $t('inventory.receiveStock') : $t('inventory.correctCount')"
    :description="material?.name"
    :ui="{ content: 'max-w-md' }"
  >
    <template #body>
      <div v-if="material" class="space-y-4">
        <UTabs
          :items="[
            { label: $t('inventory.receive'), value: 'INTAKE', icon: 'i-lucide-package-plus' },
            { label: $t('inventory.correct'), value: 'ADJUSTMENT', icon: 'i-lucide-clipboard-check' }
          ]"
          :model-value="mode"
          class="w-full"
          @update:model-value="value => { mode = value as 'INTAKE' | 'ADJUSTMENT'; quantity = value === 'ADJUSTMENT' ? material!.stockQty : 0 }"
        />

        <dl class="grid grid-cols-3 gap-2 text-center">
          <div class="rounded-md bg-elevated/60 p-2">
            <dt class="text-[11px] text-muted">
              {{ $t('inventory.onShelf') }}
            </dt>
            <dd class="text-sm font-semibold text-highlighted tabular-nums">
              {{ formatQty(material.stockQty) }}
            </dd>
          </div>
          <div class="rounded-md bg-elevated/60 p-2">
            <dt class="text-[11px] text-muted">
              {{ $t('inventory.reserved') }}
            </dt>
            <dd class="text-sm font-semibold text-warning tabular-nums">
              {{ formatQty(material.reservedQty) }}
            </dd>
          </div>
          <div class="rounded-md bg-elevated/60 p-2">
            <dt class="text-[11px] text-muted">
              {{ $t('inventory.available') }}
            </dt>
            <dd class="text-sm font-semibold text-success tabular-nums">
              {{ formatQty(material.availableQty) }}
            </dd>
          </div>
        </dl>

        <UFormField
          :label="mode === 'INTAKE'
            ? $t('inventory.qtyReceived', { unit: material.unit })
            : $t('inventory.qtyCounted', { unit: material.unit })"
          required
        >
          <UInputNumber v-model="quantity" :min="0" :step="1" class="w-full" size="lg" />
        </UFormField>

        <UFormField v-if="mode === 'INTAKE'" :label="$t('inventory.purchasePrice')" :hint="$t('inventory.purchaseHint')">
          <UInputNumber v-model="unitCost" :min="0" :step="1000" class="w-full" />
        </UFormField>

        <UFormField :label="$t('inventory.reasonRef')" :required="mode === 'ADJUSTMENT'">
          <UInput
            v-model="reason"
            :placeholder="mode === 'INTAKE' ? $t('inventory.reasonIntake') : $t('inventory.reasonCount')"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="belowReserved"
          color="error"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          :title="$t('inventory.belowReserved')"
          :description="$t('inventory.belowReservedBody', { qty: formatQty(material.reservedQty, material.unit) })"
        />

        <div v-else class="flex items-center justify-between text-sm pt-2 border-t border-default">
          <span class="text-muted">{{ $t('inventory.newBalance') }}</span>
          <span class="tabular-nums font-semibold text-highlighted">
            {{ formatQty(resulting, material.unit) }}
            <span v-if="mode === 'INTAKE' && quantity > 0" class="text-xs text-muted font-normal">
              {{ $t('inventory.valueAdded', { amount: formatMoney(quantity * unitCost, false) }) }}
            </span>
          </span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          :icon="mode === 'INTAKE' ? 'i-lucide-package-plus' : 'i-lucide-clipboard-check'"
          :loading="pending"
          :disabled="!valid"
          @click="save"
        >
          {{ mode === 'INTAKE' ? $t('inventory.receive') : $t('inventory.saveCount') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
