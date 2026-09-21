<script setup lang="ts">
import type { GarmentCategory } from '~/composables/useCatalog'
import type { MeasurementEntry } from './MeasurementCard.vue'

export interface DraftItem {
  uid: string
  garmentCategory: string | undefined
  quantity: number
  unitPrice: number
  assignedTailor: string | undefined
  measurements: MeasurementEntry[]
  measurementProfileName: string
  notes: string
  referenceImages: string[]
}

const props = defineProps<{
  index: number
  categories: GarmentCategory[]
  tailors: Array<{ _id: string, fullName: string, activeGarments: number }>
  clientId?: string | null
  removable: boolean
}>()

const emit = defineEmits<{ remove: [] }>()
const item = defineModel<DraftItem>({ required: true })

const { formatMoney } = useFormat()
const auth = useAuthStore()
const { t } = useI18n()

const category = computed(() =>
  props.categories.find(entry => entry._id === item.value.garmentCategory) ?? null
)

const categoryOptions = computed(() =>
  props.categories.map(entry => ({ label: entry.name, value: entry._id, icon: entry.icon }))
)

const tailorOptions = computed(() => [
  { label: t('orders.unassigned'), value: undefined },
  ...props.tailors.map(tailor => ({
    label: `${tailor.fullName} · ${t('orders.openCount', { n: tailor.activeGarments })}`,
    value: tailor._id
  }))
])

/** Picking a garment type seeds its base price if the operator hasn't typed one. */
watch(category, (value, previous) => {
  if (!value) return
  if (!item.value.unitPrice || item.value.unitPrice === previous?.basePrice) {
    item.value.unitPrice = value.basePrice
  }
})

const lineTotal = computed(() => item.value.quantity * item.value.unitPrice)

const bomSummary = computed(() => {
  if (!category.value?.bomTemplate?.length) return null
  const fabrics = category.value.bomTemplate.filter(line => line.materialType === 'FABRIC').length
  const accessories = category.value.bomTemplate.length - fabrics
  return `${fabrics} ${t('bom.fabrics').toLowerCase()} · ${accessories} ${t('inventory.accessory').toLowerCase()}`
})

const expanded = ref(true)
</script>

<template>
  <div class="rounded-lg ring ring-default bg-default">
    <!-- Header -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-default">
      <button
        type="button"
        class="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        :aria-expanded="expanded"
        @click="expanded = !expanded"
      >
        <span
          class="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0"
        >
          {{ index + 1 }}
        </span>
        <div class="min-w-0">
          <p class="text-sm font-medium text-highlighted truncate">
            {{ category?.name ?? $t('orders.newGarment') }}
          </p>
          <p class="text-xs text-muted truncate">
            {{ item.quantity }} × {{ formatMoney(item.unitPrice, false) }}
            <span v-if="bomSummary"> · {{ bomSummary }}</span>
          </p>
        </div>
        <UIcon
          name="i-lucide-chevron-down"
          class="size-4 text-dimmed shrink-0 transition-transform"
          :class="expanded ? 'rotate-180' : ''"
        />
      </button>

      <span class="text-sm font-semibold text-highlighted tabular-nums shrink-0">
        {{ formatMoney(lineTotal, false) }}
      </span>

      <UButton
        v-if="removable"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="xs"
        square
        :aria-label="$t('orders.removeGarment', { n: index + 1 })"
        @click="emit('remove')"
      />
    </div>

    <div v-if="expanded" class="p-4 space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <UFormField :label="$t('orders.garmentType')" required class="sm:col-span-2 lg:col-span-1">
          <USelectMenu
            v-model="item.garmentCategory"
            :items="categoryOptions"
            value-key="value"
            :placeholder="$t('orders.selectType')"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="$t('common.quantity')" required>
          <UInputNumber v-model="item.quantity" :min="1" :max="100" class="w-full" />
        </UFormField>

        <UFormField :label="$t('orders.unitPrice')" required>
          <UInputNumber v-model="item.unitPrice" :min="0" :step="10000" class="w-full" />
        </UFormField>

        <UFormField v-if="auth.can('orders:assign')" :label="$t('orders.assignedTailor')">
          <USelectMenu
            v-model="item.assignedTailor"
            :items="tailorOptions"
            value-key="value"
            :placeholder="$t('orders.unassigned')"
            class="w-full"
          />
        </UFormField>
      </div>

      <USeparator />

      <OrdersMeasurementCard
        v-model="item.measurements"
        v-model:profile-name="item.measurementProfileName"
        :fields="category?.measurementFields ?? []"
        :garment-name="category?.name"
        :client-id="clientId"
        compact
      />

      <USeparator />

      <UFormField :label="$t('orders.notesInstructions')">
        <UTextarea
          v-model="item.notes"
          :rows="2"
          :placeholder="$t('orders.notesPlaceholder')"
          class="w-full"
        />
      </UFormField>
    </div>
  </div>
</template>
