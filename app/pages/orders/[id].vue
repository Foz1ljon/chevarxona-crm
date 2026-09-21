<script setup lang="ts">
import type { OrderStatus } from '#shared/utils/orderStatus'

definePageMeta({ permission: ['orders:read', 'orders:read_assigned'] })

const route = useRoute()
const orderId = computed(() => route.params.id as string)

const auth = useAuthStore()
const { get, remove } = useOrders()
const { tailors } = useStaff()
const { formatMoney, formatDate, formatDateTime, formatRelative, formatQty, daysUntil } = useFormat()
const { orderStatus, priority, movementType } = useLabels()
const { t } = useI18n()
const toast = useApiToast()

const { data, refresh } = await get(orderId)
const order = computed(() => data.value?.order)

const { data: tailorData } = auth.can('orders:assign') ? await tailors() : { data: ref({ items: [] }) }

useHead({ title: () => order.value?.orderNumber ?? 'Order' })

const paymentOpen = ref(false)
const deleteOpen = ref(false)
const deletePending = ref(false)

const client = computed(() => {
  const value = order.value?.client
  return typeof value === 'object' && value !== null ? value : null
})

const overdue = computed(() => {
  if (!order.value?.deadline) return false
  if (order.value.status === 'COMPLETED' || order.value.status === 'CANCELLED') return false
  return (daysUntil(order.value.deadline) ?? 0) < 0
})

const stockPhaseMeta = computed(() => {
  switch (order.value?.stockPhase) {
    case 'reserved':
      return { label: t('orders.materialsReserved'), color: 'secondary', icon: 'i-lucide-lock' }
    case 'consumed':
      return { label: t('orders.materialsConsumed'), color: 'warning', icon: 'i-lucide-scissors' }
    default:
      return { label: t('orders.noStockCommitted'), color: 'neutral', icon: 'i-lucide-unlock' }
  }
})

const paidPercent = computed(() => {
  if (!order.value?.totalPrice) return 0
  return Math.round((order.value.advancePayment / order.value.totalPrice) * 100)
})

async function confirmDelete() {
  deletePending.value = true
  try {
    await remove(orderId.value)
    await navigateTo('/orders')
  } catch (error) {
    toast.error(error, t('orders.deleteFailed'))
  } finally {
    deletePending.value = false
    deleteOpen.value = false
  }
}
</script>

<template>
  <div v-if="order">
    <SharedPageHeader :title="order.orderNumber" back-to="/orders">
      <template #actions>
        <UButton
          v-if="auth.can('orders:payment') && order.balanceDue > 0 && order.status !== 'CANCELLED'"
          icon="i-lucide-banknote"
          variant="subtle"
          color="neutral"
          @click="() => { paymentOpen = true }"
        >
          {{ $t('orders.recordPayment') }}
        </UButton>
        <UButton
          v-if="auth.can('orders:delete') && order.status === 'DRAFT'"
          icon="i-lucide-trash-2"
          variant="subtle"
          color="error"
          @click="() => { deleteOpen = true }"
        >
          {{ $t('common.delete') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2">
        <SharedStatusBadge :status="order.status" size="md" />
        <UBadge
          :label="stockPhaseMeta.label"
          :icon="stockPhaseMeta.icon"
          :color="stockPhaseMeta.color as never"
          variant="subtle"
          size="sm"
        />
        <UBadge
          v-if="order.priority !== 'NORMAL'"
          :label="priority(order.priority)"
          :color="order.priority === 'URGENT' ? 'error' : order.priority === 'HIGH' ? 'warning' : 'neutral'"
          variant="subtle"
          size="sm"
        />
        <UBadge v-if="overdue" :label="$t('orders.overdue')" color="error" icon="i-lucide-alarm-clock" size="sm" />
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 items-start">
        <!-- Main -->
        <div class="xl:col-span-2 space-y-4">
          <!-- Garments -->
          <div class="space-y-3" data-tour="order-items">
            <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-shirt" class="size-4 text-primary" />
              {{ $t('orders.garments') }}
              <UBadge :label="String(order.items.length)" size="sm" variant="subtle" color="neutral" />
            </h2>

            <OrdersItemPanel
              v-for="(item, index) in order.items"
              :key="item._id"
              :order-id="order._id"
              :item="item"
              :index="index"
              :tailors="tailorData?.items ?? []"
              @changed="refresh()"
            />
          </div>

          <!-- Stock movements -->
          <UCard v-if="data?.movements?.length">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-arrow-left-right" class="size-4 text-primary" />
                {{ $t('orders.stockMovements') }}
              </h2>
            </template>

            <ul class="divide-y divide-default -my-2">
              <li
                v-for="movement in data.movements"
                :key="movement._id as string"
                class="py-2.5 flex items-center gap-3"
              >
                <UBadge
                  :label="movementType(movement.type as string)"
                  size="sm"
                  variant="subtle"
                  :color="['CONSUME', 'RESERVE'].includes(movement.type as string) ? 'warning' : 'success'"
                />
                <p class="text-sm text-toned flex-1 min-w-0 truncate">
                  {{ movement.materialName }}
                </p>
                <span
                  class="text-sm tabular-nums shrink-0"
                  :class="(movement.quantity as number) < 0 ? 'text-error' : 'text-success'"
                >
                  {{ (movement.quantity as number) > 0 ? '+' : '' }}{{ formatQty(movement.quantity as number, movement.unit as string) }}
                </span>
                <span class="text-[11px] text-dimmed shrink-0 w-28 text-right">
                  {{ formatDateTime(movement.createdAt as string) }}
                </span>
              </li>
            </ul>
          </UCard>

          <!-- History -->
          <UCard data-tour="order-history">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-history" class="size-4 text-primary" />
                {{ $t('orders.statusHistory') }}
              </h2>
            </template>

            <ol class="relative border-s border-default ms-2 space-y-4">
              <li
                v-for="(event, index) in [...order.statusHistory].reverse()"
                :key="index"
                class="ms-5"
              >
                <span
                  class="absolute -start-1.5 size-3 rounded-full ring-4 ring-default"
                  :class="index === 0 ? 'bg-primary' : 'bg-elevated'"
                />
                <p class="text-sm text-highlighted">
                  {{ event.from ? `${orderStatus(event.from as OrderStatus).label} → ` : $t('orders.createdAs') }}
                  <span class="font-medium">{{ orderStatus(event.to as OrderStatus).label }}</span>
                </p>
                <p class="text-xs text-muted mt-0.5">
                  {{ event.byName || '—' }} · {{ formatDateTime(event.at) }}
                </p>
                <p v-if="event.note" class="text-xs text-toned mt-1 italic">
                  "{{ event.note }}"
                </p>
              </li>
            </ol>
          </UCard>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4">
          <!-- Client -->
          <UCard v-if="client">
            <template #header>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-semibold text-highlighted">
                  {{ $t('orders.client') }}
                </h2>
                <UButton
                  v-if="$can('clients:read')"
                  :to="`/clients/${client._id}`"
                  icon="i-lucide-external-link"
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  square
                  :aria-label="$t('clients.openProfile')"
                />
              </div>
            </template>

            <div class="space-y-2">
              <p class="text-base font-medium text-highlighted">
                {{ client.fullName }}
              </p>
              <p class="text-sm text-muted flex items-center gap-1.5">
                <UIcon name="i-lucide-phone" class="size-3.5" />
                {{ client.phone }}
              </p>
              <p v-if="client.debtBalance" class="text-sm text-warning flex items-center gap-1.5">
                <UIcon name="i-lucide-hand-coins" class="size-3.5" />
                {{ formatMoney(client.debtBalance) }} · {{ $t('clients.outstanding') }}
              </p>
            </div>
          </UCard>

          <!-- Money -->
          <UCard data-tour="order-money">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('orders.payment') }}
              </h2>
            </template>

            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('common.subtotal') }}</span>
                <span class="tabular-nums text-toned">{{ formatMoney(order.subtotal, false) }}</span>
              </div>
              <div v-if="order.discount" class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('common.discount') }}</span>
                <span class="tabular-nums text-success">−{{ formatMoney(order.discount, false) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm pt-2 border-t border-default">
                <span class="font-medium text-toned">{{ $t('common.total') }}</span>
                <span class="tabular-nums font-semibold text-highlighted">{{ formatMoney(order.totalPrice) }}</span>
              </div>

              <UProgress
                :model-value="paidPercent"
                :max="100"
                size="sm"
                :color="order.balanceDue > 0 ? 'warning' : 'success'"
              />

              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('orders.paidPercent', { n: paidPercent }) }}</span>
                <span class="tabular-nums text-success">{{ formatMoney(order.advancePayment, false) }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('orders.balanceDue') }}</span>
                <span
                  class="tabular-nums font-semibold"
                  :class="order.balanceDue > 0 ? 'text-warning' : 'text-success'"
                >{{ formatMoney(order.balanceDue, false) }}</span>
              </div>

              <UButton
                v-if="auth.can('orders:payment') && order.balanceDue > 0 && order.status !== 'CANCELLED'"
                icon="i-lucide-banknote"
                size="sm"
                block
                class="mt-2"
                @click="() => { paymentOpen = true }"
              >
                Record payment
              </UButton>

              <ul v-if="order.payments.length" class="pt-3 border-t border-default space-y-2">
                <li
                  v-for="payment in order.payments"
                  :key="payment._id"
                  class="flex items-center justify-between text-xs"
                >
                  <span class="text-muted">
                    {{ payment.method }} · {{ formatDate(payment.receivedAt) }}
                  </span>
                  <span class="tabular-nums text-toned">{{ formatMoney(payment.amount, false) }}</span>
                </li>
              </ul>
            </div>
          </UCard>

          <!-- Schedule -->
          <UCard data-tour="order-schedule">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('orders.schedule') }}
              </h2>
            </template>

            <dl class="space-y-3 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-muted">
                  {{ $t('orders.ordered') }}
                </dt>
                <dd class="text-toned">
                  {{ formatDate(order.orderDate) }}
                </dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-muted">
                  {{ $t('orders.fitting') }}
                </dt>
                <dd class="text-toned">
                  {{ order.fittingDate ? `${formatDate(order.fittingDate)} · ${formatRelative(order.fittingDate)}` : '—' }}
                </dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-muted">
                  {{ $t('orders.deadline') }}
                </dt>
                <dd :class="overdue ? 'text-error font-medium' : 'text-toned'">
                  {{ order.deadline ? `${formatDate(order.deadline)} · ${formatRelative(order.deadline)}` : '—' }}
                </dd>
              </div>
            </dl>

            <p v-if="order.notes" class="text-sm text-toned mt-4 pt-4 border-t border-default whitespace-pre-line">
              {{ order.notes }}
            </p>
          </UCard>

          <OrdersStatusControl
            data-tour="order-status"
            :order-id="order._id"
            :status="order.status"
            @changed="refresh()"
          />
        </div>
      </div>
    </div>

    <OrdersPaymentModal
      v-model:open="paymentOpen"
      :order-id="order._id"
      :order-number="order.orderNumber"
      :balance-due="order.balanceDue"
      @saved="refresh()"
    />

    <SharedConfirmModal
      v-model:open="deleteOpen"
      :title="$t('orders.deleteTitle')"
      :description="$t('orders.deleteBody', { order: order.orderNumber })"
      :confirm-label="$t('common.delete')"
      :loading="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
