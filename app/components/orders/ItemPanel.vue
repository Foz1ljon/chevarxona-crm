<script setup lang="ts">
import { ITEM_STATUSES, type OrderItemStatus } from '#shared/utils/orderStatus'
import type { OrderItem } from '~/composables/useOrders'

const props = defineProps<{
  orderId: string
  item: OrderItem
  index: number
  tailors: Array<{ _id: string, fullName: string, activeGarments: number }>
}>()

const emit = defineEmits<{ changed: [] }>()

const auth = useAuthStore()
const toast = useApiToast()
const { updateItem } = useOrders()
const { formatMoney, formatQty } = useFormat()
const { itemStatus } = useLabels()
const { t } = useI18n()

const isMine = computed(() => props.item.assignedTailor === auth.user?.id)
const canAssign = computed(() => auth.can('orders:assign'))
const canProgress = computed(() =>
  auth.can(['orders:update', 'orders:status_change']) && (auth.can('orders:update') || isMine.value)
)

const saving = ref(false)

async function patch(body: Record<string, unknown>, successMessage: string) {
  saving.value = true
  try {
    await updateItem(props.orderId, props.item._id, body)
    toast.success(successMessage)
    emit('changed')
  } catch (error) {
    toast.error(error, t('orders.itemUpdateFailed'))
  } finally {
    saving.value = false
  }
}

function setStatus(status: OrderItemStatus) {
  patch({ status }, `${props.item.garmentName} → ${itemStatus(status).label}`)
}

function assign(tailorId: string | null) {
  patch(
    { assignedTailor: tailorId },
    tailorId ? t('orders.tailorAssigned') : t('orders.assignmentCleared')
  )
}

/* ---- Material consumption -------------------------------------------- */

const consumeOpen = ref(false)
const consumed = reactive<Record<string, number>>({})

watch(consumeOpen, (open) => {
  if (!open) return
  for (const allocation of props.item.allocations) {
    // Default to the plan — the common case is "used exactly what was planned".
    consumed[allocation.material] = allocation.consumedQty || allocation.plannedQty
  }
})

async function saveConsumption() {
  await patch(
    {
      consumed: props.item.allocations.map(allocation => ({
        material: allocation.material,
        consumedQty: consumed[allocation.material] ?? allocation.plannedQty
      }))
    },
    t('orders.usageLogged')
  )
  consumeOpen.value = false
}

const tailorItems = computed(() => [
  ...(props.item.assignedTailor
    ? [{ label: t('orders.unassign'), icon: 'i-lucide-user-minus', onSelect: () => assign(null) }]
    : []),
  ...props.tailors.map(tailor => ({
    label: `${tailor.fullName} · ${t('orders.openCount', { n: tailor.activeGarments })}`,
    icon: 'i-lucide-user',
    onSelect: () => assign(tailor._id)
  }))
])
</script>

<template>
  <div class="rounded-lg ring ring-default bg-default overflow-hidden" :class="saving ? 'opacity-60' : ''">
    <div class="px-4 py-3 border-b border-default flex flex-wrap items-center gap-3">
      <span class="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
        {{ index + 1 }}
      </span>

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-highlighted truncate">
          {{ item.garmentName }}
          <span v-if="item.quantity > 1" class="text-muted">× {{ item.quantity }}</span>
        </p>
        <p class="text-xs text-muted">
          {{ formatMoney(item.unitPrice * item.quantity, false) }}
          <span v-if="item.measurementProfileName"> · {{ item.measurementProfileName }}</span>
        </p>
      </div>

      <SharedStatusBadge :status="item.status" kind="item" />

      <UBadge
        v-if="item.assignedTailorName"
        :label="item.assignedTailorName"
        icon="i-lucide-user"
        variant="subtle"
        color="neutral"
        size="sm"
      />
      <UBadge v-else :label="$t('orders.unassigned')" variant="subtle" color="warning" size="sm" />

      <UDropdownMenu v-if="canAssign && tailorItems.length" :items="[tailorItems]">
        <UButton icon="i-lucide-user-cog" size="xs" variant="ghost" color="neutral" square :aria-label="$t('orders.assignTailor')" />
      </UDropdownMenu>
    </div>

    <div class="p-4 space-y-4">
      <!-- Progress -->
      <div v-if="canProgress">
        <p class="text-xs font-medium text-muted mb-2">
          {{ $t('orders.progress') }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <UButton
            v-for="status in ITEM_STATUSES"
            :key="status"
            :label="itemStatus(status).label"
            :icon="itemStatus(status).icon"
            size="xs"
            :color="item.status === status ? (itemStatus(status).color as never) : 'neutral'"
            :variant="item.status === status ? 'solid' : 'subtle'"
            :disabled="saving"
            @click="setStatus(status)"
          />
        </div>
      </div>

      <!-- Measurements -->
      <div v-if="item.measurements.length">
        <p class="text-xs font-medium text-muted mb-2">
          {{ $t('orders.cutTo') }}
        </p>
        <dl class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-2">
          <div v-for="value in item.measurements" :key="value.key" class="min-w-0">
            <dt class="text-[11px] text-muted truncate">
              {{ value.label }}
            </dt>
            <dd class="text-sm font-medium text-highlighted tabular-nums">
              {{ value.value }}<span class="text-[10px] text-dimmed ml-0.5">{{ value.unit }}</span>
            </dd>
          </div>
        </dl>
      </div>

      <!-- Materials -->
      <div v-if="item.allocations.length">
        <div class="flex items-center justify-between gap-2 mb-2">
          <p class="text-xs font-medium text-muted">
            {{ $t('orders.allocatedMaterials') }}
          </p>
          <UButton
            v-if="canProgress"
            icon="i-lucide-clipboard-check"
            size="xs"
            variant="ghost"
            color="neutral"
            @click="() => { consumeOpen = true }"
          >
            {{ $t('orders.logUsage') }}
          </UButton>
        </div>

        <ul class="rounded-md ring ring-default divide-y divide-default">
          <li
            v-for="allocation in item.allocations"
            :key="allocation.material"
            class="px-3 py-2 flex items-center gap-3"
          >
            <UIcon
              :name="allocation.materialType === 'FABRIC' ? 'i-lucide-layers' : 'i-lucide-scissors'"
              class="size-4 text-dimmed shrink-0"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm text-toned truncate">
                {{ allocation.name }}
              </p>
              <p class="text-[11px] text-dimmed font-mono">
                {{ allocation.sku }}
              </p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm tabular-nums text-highlighted">
                {{ formatQty(allocation.plannedQty, allocation.unit) }}
              </p>
              <p
                v-if="allocation.consumedQty"
                class="text-[11px] tabular-nums"
                :class="allocation.consumedQty > allocation.plannedQty ? 'text-warning' : 'text-success'"
              >
                {{ $t('orders.used', { qty: formatQty(allocation.consumedQty, allocation.unit) }) }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <p v-if="item.notes" class="text-sm text-toned bg-elevated/50 rounded-md p-3 whitespace-pre-line">
        {{ item.notes }}
      </p>
    </div>

    <!-- Consumption modal -->
    <UModal
      v-model:open="consumeOpen"
      :title="$t('orders.logUsageTitle')"
      :description="$t('orders.logUsageBody', { garment: item.garmentName })"
    >
      <template #body>
        <div class="space-y-3">
          <div
            v-for="allocation in item.allocations"
            :key="allocation.material"
            class="flex items-center gap-3"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm text-highlighted truncate">
                {{ allocation.name }}
              </p>
              <p class="text-[11px] text-muted">
                {{ $t('orders.planned', { qty: formatQty(allocation.plannedQty, allocation.unit) }) }}
              </p>
            </div>
            <UInputNumber
              v-model="consumed[allocation.material]"
              :min="0"
              :step="0.1"
              class="w-32"
              size="sm"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton variant="ghost" color="neutral" @click="() => { consumeOpen = false }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton icon="i-lucide-save" :loading="saving" @click="saveConsumption">
            {{ $t('orders.saveUsage') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
