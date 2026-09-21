<script setup lang="ts">
import type { MeasurementField } from '~/composables/useCatalog'
import type { MeasurementProfile } from '~/composables/useClients'

export interface MeasurementEntry {
  key: string
  label: string
  value: number
  unit: string
}

const props = defineProps<{
  /** Field definitions from the selected garment category. */
  fields: MeasurementField[]
  garmentName?: string
  clientId?: string | null
  compact?: boolean
}>()

const model = defineModel<MeasurementEntry[]>({ default: () => [] })
const profileName = defineModel<string>('profileName', { default: '' })

const { measurements } = useClients()
const toast = useApiToast()
const { t } = useI18n()

/** Field key → value, the shape the inputs bind to. */
const values = reactive<Record<string, number | undefined>>({})

const sortedFields = computed(() => [...props.fields].sort((a, b) => a.order - b.order))

// Hydrate the local map whenever the incoming model or the field set changes.
watch([model, () => props.fields], () => {
  for (const field of props.fields) {
    const existing = model.value.find(entry => entry.key === field.key)
    values[field.key] = existing?.value
  }
  // Drop values for fields that no longer belong to this garment type.
  for (const key of Object.keys(values)) {
    if (!props.fields.some(field => field.key === key)) delete values[key]
  }
}, { immediate: true, deep: true })

/** Push back only the fields that actually have a number. */
function sync() {
  model.value = sortedFields.value
    .filter(field => typeof values[field.key] === 'number' && !Number.isNaN(values[field.key]))
    .map(field => ({
      key: field.key,
      label: field.label,
      value: Number(values[field.key]),
      unit: field.unit
    }))
}

const missingRequired = computed(() =>
  sortedFields.value.filter(field => field.required && typeof values[field.key] !== 'number')
)

const filledCount = computed(() =>
  sortedFields.value.filter(field => typeof values[field.key] === 'number').length
)

/* ---- Saved client profiles ------------------------------------------- */

const profiles = ref<MeasurementProfile[]>([])
const loadingProfiles = ref(false)

async function loadProfiles() {
  if (!props.clientId) {
    profiles.value = []
    return
  }
  loadingProfiles.value = true
  try {
    const result = await measurements(props.clientId)
    profiles.value = result.profiles
  } catch {
    profiles.value = []
  } finally {
    loadingProfiles.value = false
  }
}

watch(() => props.clientId, loadProfiles, { immediate: true })

/** Applies a saved profile, keeping only keys this garment type actually uses. */
function applyProfile(profile: MeasurementProfile) {
  let applied = 0
  let skipped = 0

  for (const entry of profile.values) {
    if (props.fields.some(field => field.key === entry.key)) {
      values[entry.key] = entry.value
      applied++
    } else {
      skipped++
    }
  }

  profileName.value = `${profile.name} v${profile.version}`
  sync()

  toast.info(
    t('measurements.applied', { name: profile.name }),
    skipped
      ? t('measurements.appliedSkipped', {
          n: applied,
          s: skipped,
          garment: props.garmentName ?? t('orders.newGarment')
        })
      : t('measurements.appliedCount', { n: applied })
  )
}

function clearAll() {
  for (const key of Object.keys(values)) values[key] = undefined
  profileName.value = ''
  sync()
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <UIcon name="i-lucide-ruler" class="size-4 text-primary shrink-0" />
        <h4 class="text-sm font-medium text-highlighted">
          {{ $t('measurements.title') }}
        </h4>
        <UBadge
          v-if="fields.length"
          :label="`${filledCount}/${fields.length}`"
          size="sm"
          variant="subtle"
          :color="missingRequired.length ? 'warning' : 'success'"
        />
        <UBadge v-if="profileName" :label="profileName" size="sm" variant="subtle" color="info" />
      </div>

      <div class="flex items-center gap-1.5">
        <UDropdownMenu
          v-if="profiles.length"
          :items="[profiles.map(profile => ({
            label: `${profile.name} v${profile.version}`,
            icon: 'i-lucide-bookmark',
            onSelect: () => applyProfile(profile)
          }))]"
        >
          <UButton
            icon="i-lucide-bookmark"
            size="xs"
            variant="subtle"
            color="neutral"
            :loading="loadingProfiles"
          >
            {{ $t('measurements.loadSaved') }}
          </UButton>
        </UDropdownMenu>

        <UButton
          v-if="filledCount"
          icon="i-lucide-eraser"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="clearAll"
        >
          {{ $t('common.clear') }}
        </UButton>
      </div>
    </div>

    <SharedEmptyState
      v-if="!fields.length"
      icon="i-lucide-ruler"
      :title="$t('measurements.pickGarment')"
      :description="$t('measurements.pickGarmentHint')"
      compact
    />

    <template v-else>
      <div
        class="grid gap-3"
        :class="compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'"
      >
        <div v-for="field in sortedFields" :key="field.key">
          <label
            :for="`m-${field.key}`"
            class="block text-xs font-medium text-toned mb-1 truncate"
            :title="field.hint || field.label"
          >
            {{ field.label }}
            <span v-if="field.required" class="text-error">*</span>
          </label>

          <UInput
            :id="`m-${field.key}`"
            v-model.number="values[field.key]"
            type="number"
            step="0.5"
            :min="field.min"
            :max="field.max"
            size="sm"
            placeholder="—"
            class="w-full"
            :color="field.required && typeof values[field.key] !== 'number' ? 'warning' : undefined"
            :highlight="field.required && typeof values[field.key] !== 'number'"
            @update:model-value="sync"
          >
            <template #trailing>
              <span class="text-[10px] text-dimmed">{{ field.unit }}</span>
            </template>
          </UInput>
        </div>
      </div>

      <UAlert
        v-if="missingRequired.length"
        icon="i-lucide-info"
        color="warning"
        variant="subtle"
        :title="$t('measurements.missingRequired', { n: missingRequired.length })"
        :description="missingRequired.map(field => field.label).join(', ')"
      />
    </template>
  </div>
</template>
