<script setup lang="ts">
import type { DraftItem } from '~/components/orders/OrderItemEditor.vue'
import type { Client } from '~/composables/useClients'

definePageMeta({ permission: 'orders:create' })
const { t } = useI18n()
useHead({ title: () => t('orders.newTitle') })

const auth = useAuthStore()
const toast = useApiToast()
const { orderStatus } = useLabels()
const { create, previewBom } = useOrders()
const { search: searchClients } = useClients()
const { categories } = useCatalog()
const { tailors } = useStaff()
const { formatMoney, toDateInput } = useFormat()

const { data: catalogData } = await categories({ active: 'true' })
const { data: tailorData } = auth.can('orders:assign') ? await tailors() : { data: ref({ items: [] }) }

/* ---- Client selection ------------------------------------------------- */

const clientQuery = ref('')
const clientResults = ref<Client[]>([])
const selectedClient = ref<Client | null>(null)
const searchingClients = ref(false)
const newClientOpen = ref(false)

const debouncedClientQuery = useDebounced(clientQuery, 250)

watch(debouncedClientQuery, async (term) => {
  if (!term || term.length < 2) {
    clientResults.value = []
    return
  }
  searchingClients.value = true
  try {
    clientResults.value = await searchClients(term)
  } finally {
    searchingClients.value = false
  }
})

function onClientCreated(client: Client) {
  selectedClient.value = client
  newClientOpen.value = false
}

/* ---- Items ------------------------------------------------------------ */

let uidCounter = 0
const newItem = (): DraftItem => ({
  uid: `item-${++uidCounter}`,
  garmentCategory: undefined,
  quantity: 1,
  unitPrice: 0,
  assignedTailor: undefined,
  measurements: [],
  measurementProfileName: '',
  notes: '',
  referenceImages: []
})

const items = ref<DraftItem[]>([newItem()])

function addItem() {
  items.value.push(newItem())
}

function removeItem(index: number) {
  items.value.splice(index, 1)
}

/* ---- Order-level fields ----------------------------------------------- */

const form = reactive({
  orderDate: toDateInput(new Date()),
  fittingDate: '',
  deadline: '',
  discount: 0,
  advancePayment: 0,
  priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
  notes: '',
  status: 'DRAFT' as 'DRAFT' | 'PENDING_DEPOSIT' | 'MATERIAL_ALLOCATED'
})

/** Suggests a deadline from the slowest garment in the order. */
const suggestedDays = computed(() => {
  const days = items.value
    .map(item => catalogData.value?.items.find(c => c._id === item.garmentCategory)?.estimatedDays ?? 0)
    .filter(Boolean)
  return days.length ? Math.max(...days) : null
})

watch(suggestedDays, (days) => {
  if (!days || form.deadline) return
  const target = new Date()
  target.setDate(target.getDate() + days)
  form.deadline = toDateInput(target)
})

const subtotal = computed(() =>
  items.value.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
)
const total = computed(() => Math.max(0, subtotal.value - form.discount))
const balanceDue = computed(() => total.value - form.advancePayment)

/* ---- Live BOM preview -------------------------------------------------- */

const bom = ref<Awaited<ReturnType<typeof previewBom>> | null>(null)
const bomLoading = ref(false)

/** Only items with a garment type are meaningful to the calculator. */
const payloadItems = computed(() =>
  items.value
    .filter(item => item.garmentCategory)
    .map(item => ({
      garmentCategory: item.garmentCategory,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      assignedTailor: item.assignedTailor ?? null,
      measurements: item.measurements,
      measurementProfileName: item.measurementProfileName,
      notes: item.notes,
      referenceImages: item.referenceImages
    }))
)

const bomKey = computed(() =>
  JSON.stringify(payloadItems.value.map(item => [item.garmentCategory, item.quantity, item.unitPrice]))
)
const debouncedBomKey = useDebounced(bomKey, 400)

watch(debouncedBomKey, async () => {
  if (!payloadItems.value.length) {
    bom.value = null
    return
  }
  bomLoading.value = true
  try {
    bom.value = await previewBom(payloadItems.value)
  } catch {
    bom.value = null
  } finally {
    bomLoading.value = false
  }
}, { immediate: true })

/* ---- Submit ------------------------------------------------------------ */

const submitting = ref(false)

const problems = computed(() => {
  const list: string[] = []
  if (!selectedClient.value) list.push(t('orders.pSelectClient'))
  if (!payloadItems.value.length) list.push(t('orders.pAddGarment'))
  if (items.value.some(item => item.garmentCategory && item.unitPrice <= 0)) {
    list.push(t('orders.pPrice'))
  }
  if (form.status === 'MATERIAL_ALLOCATED' && bom.value && !bom.value.canAllocate) {
    list.push(t('orders.pStock'))
  }
  if (form.advancePayment > total.value) list.push(t('orders.pAdvance'))
  return list
})

const statusOptions = computed(() => {
  const values = auth.can('orders:status_change')
    ? ['DRAFT', 'PENDING_DEPOSIT', 'MATERIAL_ALLOCATED'] as const
    : ['DRAFT', 'PENDING_DEPOSIT'] as const

  return values.map((value) => {
    const meta = orderStatus(value)
    return { label: meta.label, value, description: meta.description }
  })
})

async function submit() {
  if (problems.value.length) {
    toast.error({ data: { message: problems.value[0] } }, t('orders.cannotSave'))
    return
  }

  submitting.value = true
  try {
    const order = await create({
      client: selectedClient.value!._id,
      status: form.status,
      orderDate: form.orderDate || null,
      fittingDate: form.fittingDate || null,
      deadline: form.deadline || null,
      items: payloadItems.value,
      discount: form.discount,
      advancePayment: form.advancePayment,
      priority: form.priority,
      notes: form.notes
    })
    await navigateTo(`/orders/${order._id}`)
  } catch (error) {
    toast.error(error, t('orders.createFailed'))
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('orders.newTitle')"
      :description="$t('orders.newSubtitle')"
      back-to="/orders"
    >
      <template #actions>
        <UButton color="neutral" variant="ghost" to="/orders">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          icon="i-lucide-check"
          :loading="submitting"
          :disabled="problems.length > 0"
          @click="submit"
        >
          {{ $t('orders.createOrder') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 xl:gap-6 items-start">
        <!-- Main column -->
        <div class="xl:col-span-2 space-y-4">
          <!-- Client -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                  <UIcon name="i-lucide-user" class="size-4 text-primary" />
                  {{ $t('orders.client') }}
                </h2>
                <UButton
                  v-if="$can('clients:create')"
                  icon="i-lucide-user-plus"
                  size="xs"
                  variant="subtle"
                  color="neutral"
                  @click="() => { newClientOpen = true }"
                >
                  {{ $t('clients.newClient') }}
                </UButton>
              </div>
            </template>

            <div v-if="selectedClient" class="flex items-center gap-3">
              <div class="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <UIcon name="i-lucide-user" class="size-5" />
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-highlighted truncate">
                  {{ selectedClient.fullName }}
                </p>
                <p class="text-xs text-muted">
                  {{ selectedClient.phone }}
                  <span v-if="selectedClient.totalOrders"> · {{ $t('orders.previousOrders', { n: selectedClient.totalOrders }) }}</span>
                </p>
              </div>
              <UBadge
                v-if="selectedClient.debtBalance > 0"
                :label="$t('orders.owed', { amount: formatMoney(selectedClient.debtBalance, false) })"
                color="warning"
                variant="subtle"
                size="sm"
              />
              <UButton
                icon="i-lucide-x"
                size="xs"
                variant="ghost"
                color="neutral"
                square
                :aria-label="$t('orders.changeClient')"
                @click="() => { selectedClient = null }"
              />
            </div>

            <div v-else class="space-y-2">
              <UInput
                v-model="clientQuery"
                icon="i-lucide-search"
                :placeholder="$t('orders.searchClient')"
                size="lg"
                class="w-full"
                :loading="searchingClients"
                autofocus
              />

              <ul v-if="clientResults.length" class="divide-y divide-default rounded-md ring ring-default overflow-hidden">
                <li v-for="client in clientResults" :key="client._id">
                  <button
                    type="button"
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-elevated transition-colors text-left"
                    @click="selectedClient = client; clientQuery = ''"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-highlighted truncate">
                        {{ client.fullName }}
                      </p>
                      <p class="text-xs text-muted">
                        {{ client.phone }} · {{ $t('orders.ordersCount', { n: client.totalOrders }) }}
                      </p>
                    </div>
                    <UBadge
                      v-if="client.debtBalance > 0"
                      :label="formatMoney(client.debtBalance, false)"
                      color="warning"
                      variant="subtle"
                      size="sm"
                    />
                  </button>
                </li>
              </ul>

              <p v-else-if="clientQuery.length >= 2 && !searchingClients" class="text-sm text-muted py-2">
                {{ $t('orders.noClientMatch', { q: clientQuery }) }}
                <button
                  v-if="auth.can('clients:create')"
                  type="button"
                  class="text-primary hover:underline"
                  @click="newClientOpen = true"
                >
                  {{ $t('orders.createOne') }}
                </button>
              </p>
            </div>
          </UCard>

          <!-- Garments -->
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-shirt" class="size-4 text-primary" />
                {{ $t('orders.garments') }}
                <UBadge :label="String(items.length)" size="sm" variant="subtle" color="neutral" />
              </h2>
              <UButton icon="i-lucide-plus" size="xs" variant="subtle" @click="addItem">
                {{ $t('orders.addGarment') }}
              </UButton>
            </div>

            <OrdersOrderItemEditor
              v-for="(item, index) in items"
              :key="item.uid"
              v-model="items[index]!"
              :index="index"
              :categories="catalogData?.items ?? []"
              :tailors="tailorData?.items ?? []"
              :client-id="selectedClient?._id ?? null"
              :removable="items.length > 1"
              @remove="removeItem(index)"
            />
          </div>

          <!-- Schedule & notes -->
          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-calendar-days" class="size-4 text-primary" />
                {{ $t('orders.schedule') }}
              </h2>
            </template>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UFormField :label="$t('orders.orderDate')">
                <SharedDatePicker v-model="form.orderDate" :placeholder="$t('common.pickDate')" />
              </UFormField>

              <UFormField :label="$t('orders.fittingDate')" :hint="$t('common.optional')">
                <SharedDatePicker
                  v-model="form.fittingDate"
                  :min="form.orderDate"
                  :placeholder="$t('common.pickDate')"
                />
              </UFormField>

              <UFormField
                :label="$t('orders.deadline')"
                :hint="suggestedDays ? $t('orders.daysSuggested', { n: suggestedDays }) : undefined"
              >
                <SharedDatePicker
                  v-model="form.deadline"
                  :min="form.orderDate"
                  :placeholder="$t('common.pickDate')"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <UFormField :label="$t('priority.label')">
                <USelect
                  v-model="form.priority"
                  :items="[
                    { label: $t('priority.LOW'), value: 'LOW' },
                    { label: $t('priority.NORMAL'), value: 'NORMAL' },
                    { label: $t('priority.HIGH'), value: 'HIGH' },
                    { label: $t('priority.URGENT'), value: 'URGENT' }
                  ]"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField :label="$t('orders.orderNotes')" class="mt-3">
              <UTextarea
                v-model="form.notes"
                :rows="2"
                :placeholder="$t('orders.orderNotesPlaceholder')"
                class="w-full"
              />
            </UFormField>
          </UCard>
        </div>

        <!-- Sidebar -->
        <div class="space-y-4 xl:sticky xl:top-20">
          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-receipt-text" class="size-4 text-primary" />
                {{ $t('orders.pricing') }}
              </h2>
            </template>

            <div class="space-y-3">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('common.subtotal') }}</span>
                <span class="tabular-nums font-medium text-highlighted">{{ formatMoney(subtotal) }}</span>
              </div>

              <UFormField :label="$t('common.discount')">
                <UInputNumber v-model="form.discount" :min="0" :max="subtotal" :step="10000" class="w-full" />
              </UFormField>

              <div class="flex items-center justify-between text-sm pt-1 border-t border-default">
                <span class="font-medium text-toned">{{ $t('common.total') }}</span>
                <span class="tabular-nums font-semibold text-highlighted text-base">{{ formatMoney(total) }}</span>
              </div>

              <UFormField :label="$t('orders.advancePayment')">
                <UInputNumber v-model="form.advancePayment" :min="0" :max="total" :step="10000" class="w-full" />
              </UFormField>

              <div class="flex items-center justify-between text-sm">
                <span class="text-muted">{{ $t('orders.balanceDue') }}</span>
                <span
                  class="tabular-nums font-semibold"
                  :class="balanceDue > 0 ? 'text-warning' : 'text-success'"
                >{{ formatMoney(balanceDue) }}</span>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted flex items-center gap-2">
                <UIcon name="i-lucide-flag" class="size-4 text-primary" />
                {{ $t('orders.saveAs') }}
              </h2>
            </template>

            <URadioGroup
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              :ui="{ item: 'items-start' }"
            />
          </UCard>

          <OrdersBomCalculator
            :lines="bom?.lines ?? []"
            :shortages="bom?.shortages ?? []"
            :material-cost="bom?.materialCost ?? 0"
            :subtotal="subtotal"
            :can-allocate="bom?.canAllocate ?? true"
            :loading="bomLoading"
          />

          <UAlert
            v-if="problems.length"
            icon="i-lucide-circle-alert"
            color="warning"
            variant="subtle"
            :title="$t('common.beforeSave')"
          >
            <template #description>
              <ul class="list-disc list-inside space-y-0.5">
                <li v-for="problem in problems" :key="problem">
                  {{ problem }}
                </li>
              </ul>
            </template>
          </UAlert>
        </div>
      </div>
    </div>

    <ClientsClientFormModal v-model:open="newClientOpen" @saved="onClientCreated" />
  </div>
</template>
