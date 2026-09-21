<script setup lang="ts">
import type { MeasurementEntry } from '~/components/orders/MeasurementCard.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ clientId: string, clientName: string }>()
const emit = defineEmits<{ saved: [] }>()

const { categories } = useCatalog()
const { saveMeasurements } = useClients()
const toast = useApiToast()
const { t } = useI18n()

const { data: catalogData } = await categories({ active: 'true' })

const categoryId = ref<string | undefined>()
const profileName = ref('')
const notes = ref('')
const values = ref<MeasurementEntry[]>([])
const pending = ref(false)

const category = computed(() =>
  catalogData.value?.items.find(entry => entry._id === categoryId.value) ?? null
)

const categoryOptions = computed(() =>
  (catalogData.value?.items ?? []).map(entry => ({ label: entry.name, value: entry._id }))
)

// Default the profile name to the garment type — most workshops name them that way.
watch(category, (value) => {
  if (value && !profileName.value) profileName.value = value.name
})

watch(open, (isOpen) => {
  if (isOpen) return
  categoryId.value = undefined
  profileName.value = ''
  notes.value = ''
  values.value = []
})

const missingRequired = computed(() =>
  (category.value?.measurementFields ?? []).filter(
    field => field.required && !values.value.some(entry => entry.key === field.key)
  )
)

const canSave = computed(() =>
  Boolean(profileName.value.trim()) && values.value.length > 0 && missingRequired.value.length === 0
)

async function save() {
  pending.value = true
  try {
    await saveMeasurements(props.clientId, {
      name: profileName.value.trim(),
      garmentCategory: categoryId.value ?? null,
      notes: notes.value,
      values: values.value
    })
    emit('saved')
    open.value = false
  } catch (error) {
    toast.error(error, t('measurements.saveFailed'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('measurements.recordTitle')"
    :description="$t('measurements.recordBody', { name: clientName })"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('orders.garmentType')" :hint="$t('measurements.garmentDrives')">
            <USelectMenu
              v-model="categoryId"
              :items="categoryOptions"
              value-key="value"
              :placeholder="$t('orders.selectType')"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('measurements.profileName')" required>
            <UInput v-model="profileName" :placeholder="$t('measurements.profileNamePlaceholder')" class="w-full" />
          </UFormField>
        </div>

        <USeparator />

        <OrdersMeasurementCard
          v-model="values"
          :fields="category?.measurementFields ?? []"
          :garment-name="category?.name"
          :client-id="clientId"
        />

        <UFormField :label="$t('common.notes')">
          <UTextarea
            v-model="notes"
            :rows="2"
            :placeholder="$t('measurements.notesPlaceholder')"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton icon="i-lucide-save" :loading="pending" :disabled="!canSave" @click="save">
          {{ $t('measurements.saveRevision') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
