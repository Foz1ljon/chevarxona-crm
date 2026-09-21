<script setup lang="ts">
import type { GarmentCategory } from '~/composables/useCatalog'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ category?: GarmentCategory | null }>()
const emit = defineEmits<{ saved: [] }>()

const { create, update } = useCatalog()
const { options } = useInventory()
const { formatQty } = useFormat()
const toast = useApiToast()
const { t } = useI18n()

const { data: materialOptions } = await options()

const isEdit = computed(() => Boolean(props.category?._id))
const pending = ref(false)
const tab = ref<'basics' | 'measurements' | 'bom'>('basics')

interface FieldDraft {
  key: string
  label: string
  unit: string
  required: boolean
  min: number
  max: number
  hint: string
  order: number
}

interface BomDraft {
  materialType: 'FABRIC' | 'ACCESSORY'
  material: string | undefined
  label: string
  quantity: number
  wastagePercent: number
  optional: boolean
}

const state = reactive({
  name: '',
  slug: '',
  description: '',
  icon: 'i-lucide-shirt',
  basePrice: 0,
  estimatedDays: 7,
  sortOrder: 0
})

const fields = ref<FieldDraft[]>([])
const bom = ref<BomDraft[]>([])

/** `Two-piece Suit` → `two-piece-suit` */
function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

watch(() => state.name, (name) => {
  if (!isEdit.value) state.slug = slugify(name)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  tab.value = 'basics'

  const category = props.category
  Object.assign(state, {
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    icon: category?.icon ?? 'i-lucide-shirt',
    basePrice: category?.basePrice ?? 0,
    estimatedDays: category?.estimatedDays ?? 7,
    sortOrder: category?.sortOrder ?? 0
  })

  fields.value = (category?.measurementFields ?? []).map((field, index) => ({ ...field, order: field.order ?? index }))

  bom.value = (category?.bomTemplate ?? []).map(line => ({
    materialType: line.materialType,
    material: typeof line.material === 'object' && line.material ? line.material._id : (line.material as string),
    label: line.label,
    quantity: line.quantity,
    wastagePercent: line.wastagePercent ?? 0,
    optional: line.optional ?? false
  }))
})

/* ---- Measurement fields ---------------------------------------------- */

function addField() {
  fields.value.push({
    key: '', label: '', unit: 'cm', required: false, min: 0, max: 400, hint: '', order: fields.value.length
  })
}

function removeField(index: number) {
  fields.value.splice(index, 1)
  fields.value.forEach((field, i) => { field.order = i })
}

function onFieldLabel(index: number) {
  const field = fields.value[index]!
  if (!field.key) field.key = field.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const duplicateKeys = computed(() => {
  const seen = new Set<string>()
  const dupes = new Set<string>()
  for (const field of fields.value) {
    if (!field.key) continue
    if (seen.has(field.key)) dupes.add(field.key)
    seen.add(field.key)
  }
  return dupes
})

/* ---- BOM lines --------------------------------------------------------- */

function addBomLine(type: 'FABRIC' | 'ACCESSORY') {
  bom.value.push({
    materialType: type,
    material: undefined,
    label: type === 'FABRIC' ? t('catalog.defaultFabricLine') : t('catalog.defaultAccessoryLine'),
    quantity: type === 'FABRIC' ? 2 : 1,
    wastagePercent: type === 'FABRIC' ? 8 : 0,
    optional: false
  })
}

function removeBomLine(index: number) {
  bom.value.splice(index, 1)
}

function materialItems(type: 'FABRIC' | 'ACCESSORY') {
  const source = type === 'FABRIC' ? materialOptions.value?.fabrics : materialOptions.value?.accessories
  return (source ?? []).map(material => ({
    label: `${material.name} (${material.sku})`,
    value: material._id
  }))
}

function materialUnit(line: BomDraft) {
  const source = line.materialType === 'FABRIC' ? materialOptions.value?.fabrics : materialOptions.value?.accessories
  return (source ?? []).find(material => material._id === line.material)?.unit ?? ''
}

function materialAvailable(line: BomDraft) {
  const source = line.materialType === 'FABRIC' ? materialOptions.value?.fabrics : materialOptions.value?.accessories
  return (source ?? []).find(material => material._id === line.material)?.availableQty ?? 0
}

/* ---- Save -------------------------------------------------------------- */

const problems = computed(() => {
  const list: string[] = []
  if (state.name.trim().length < 2) list.push(t('catalog.pName'))
  if (!/^[a-z0-9-]+$/.test(state.slug)) list.push(t('catalog.pSlug'))
  if (duplicateKeys.value.size) list.push(t('catalog.pDupKeys', { keys: [...duplicateKeys.value].join(', ') }))
  if (fields.value.some(field => !field.key || !field.label)) list.push(t('catalog.pFieldKeys'))
  if (bom.value.some(line => !line.material)) list.push(t('catalog.pBomMaterial'))
  return list
})

async function save() {
  if (problems.value.length) {
    toast.error({ data: { message: problems.value[0] } }, t('orders.cannotSave'))
    return
  }

  pending.value = true
  try {
    const body = {
      ...state,
      measurementFields: fields.value.map((field, index) => ({ ...field, order: index })),
      bomTemplate: bom.value.map(line => ({
        materialType: line.materialType,
        material: line.material,
        materialModel: line.materialType === 'FABRIC' ? 'Fabric' : 'Accessory',
        accessoryCategory: '',
        label: line.label,
        quantity: line.quantity,
        unit: materialUnit(line),
        wastagePercent: line.wastagePercent,
        optional: line.optional
      }))
    }

    if (isEdit.value) await update(props.category!._id, body)
    else await create(body)

    emit('saved')
    open.value = false
  } catch (error) {
    toast.error(error, t('catalog.saveFailed'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="isEdit ? `${$t('common.edit')} — ${category?.name}` : $t('catalog.newType')"
    :description="$t('catalog.editorSubtitle')"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="space-y-4">
        <UTabs
          v-model="tab"
          :items="[
            { label: $t('catalog.basics'), value: 'basics', icon: 'i-lucide-info' },
            { label: $t('catalog.measurementsTab', { n: fields.length }), value: 'measurements', icon: 'i-lucide-ruler' },
            { label: $t('catalog.bomTab', { n: bom.length }), value: 'bom', icon: 'i-lucide-package' }
          ]"
          class="w-full"
        />

        <!-- Basics -->
        <div v-show="tab === 'basics'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('common.name')" required class="sm:col-span-2">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>

          <UFormField :label="$t('catalog.slug')" required :hint="$t('catalog.slugHint')">
            <UInput v-model="state.slug" class="w-full font-mono" :disabled="isEdit" />
          </UFormField>

          <UFormField :label="$t('catalog.icon')" :hint="$t('catalog.iconHint')">
            <UInput v-model="state.icon" class="w-full font-mono">
              <template #trailing>
                <UIcon :name="state.icon" class="size-4 text-dimmed" />
              </template>
            </UInput>
          </UFormField>

          <UFormField :label="$t('catalog.basePrice')">
            <UInputNumber v-model="state.basePrice" :min="0" :step="50000" class="w-full" />
          </UFormField>

          <UFormField :label="$t('catalog.typicalLeadTime')" :hint="$t('catalog.workingDays')">
            <UInputNumber v-model="state.estimatedDays" :min="0" :max="365" class="w-full" />
          </UFormField>

          <UFormField :label="$t('catalog.description')" class="sm:col-span-2">
            <UTextarea v-model="state.description" :rows="2" class="w-full" />
          </UFormField>
        </div>

        <!-- Measurements -->
        <div v-show="tab === 'measurements'" class="space-y-3">
          <UAlert
            icon="i-lucide-ruler"
            color="neutral"
            variant="subtle"
            :description="$t('catalog.measurementsHint')"
          />

          <SharedEmptyState
            v-if="!fields.length"
            icon="i-lucide-ruler"
            :title="$t('catalog.noFields')"
            :description="$t('catalog.noFieldsHint')"
            compact
          />

          <div
            v-for="(field, index) in fields"
            :key="index"
            class="grid grid-cols-12 gap-2 items-end rounded-md ring ring-default p-2.5"
          >
            <UFormField :label="$t('catalog.label')" class="col-span-12 sm:col-span-4">
              <UInput
                v-model="field.label"
                size="sm"
                class="w-full"
                @blur="onFieldLabel(index)"
              />
            </UFormField>

            <UFormField :label="$t('catalog.key')" class="col-span-6 sm:col-span-3">
              <UInput
                v-model="field.key"
                size="sm"
                class="w-full font-mono"
                :color="duplicateKeys.has(field.key) ? 'error' : undefined"
                :highlight="duplicateKeys.has(field.key)"
              />
            </UFormField>

            <UFormField :label="$t('common.unit')" class="col-span-3 sm:col-span-2">
              <UInput v-model="field.unit" size="sm" class="w-full" />
            </UFormField>

            <div class="col-span-3 sm:col-span-2 pb-1.5">
              <UCheckbox v-model="field.required" :label="$t('common.required')" />
            </div>

            <div class="col-span-12 sm:col-span-1 flex justify-end pb-0.5">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                square
                :aria-label="$t('catalog.removeField', { name: field.label || $t('catalog.label') })"
                @click="removeField(index)"
              />
            </div>
          </div>

          <UButton icon="i-lucide-plus" size="sm" variant="subtle" block @click="addField">
            {{ $t('catalog.addField') }}
          </UButton>
        </div>

        <!-- BOM -->
        <div v-show="tab === 'bom'" class="space-y-3">
          <UAlert
            icon="i-lucide-calculator"
            color="neutral"
            variant="subtle"
            :description="$t('catalog.bomHint')"
          />

          <SharedEmptyState
            v-if="!bom.length"
            icon="i-lucide-package"
            :title="$t('catalog.noBom')"
            :description="$t('catalog.noBomHint')"
            compact
          />

          <div
            v-for="(line, index) in bom"
            :key="index"
            class="rounded-md ring ring-default p-2.5 space-y-2"
          >
            <div class="grid grid-cols-12 gap-2 items-end">
              <UFormField :label="$t('catalog.lineLabel')" class="col-span-12 sm:col-span-4">
                <UInput v-model="line.label" size="sm" class="w-full" :placeholder="$t('catalog.lineLabelPlaceholder')" />
              </UFormField>

              <UFormField :label="$t('movements.material')" class="col-span-12 sm:col-span-5">
                <USelectMenu
                  v-model="line.material"
                  :items="materialItems(line.materialType)"
                  value-key="value"
                  size="sm"
                  :placeholder="$t('catalog.selectMaterial')"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="$t('catalog.qtyUnit', { unit: materialUnit(line) || '—' })" class="col-span-5 sm:col-span-1">
                <UInputNumber v-model="line.quantity" :min="0" :step="0.1" size="sm" class="w-full" />
              </UFormField>

              <UFormField :label="$t('catalog.waste')" class="col-span-5 sm:col-span-1">
                <UInputNumber v-model="line.wastagePercent" :min="0" :max="100" size="sm" class="w-full" />
              </UFormField>

              <div class="col-span-2 sm:col-span-1 flex justify-end pb-0.5">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  square
                  :aria-label="$t('catalog.removeField', { name: line.label })"
                  @click="removeBomLine(index)"
                />
              </div>
            </div>

            <p v-if="line.material" class="text-[11px] text-muted">
              {{ $t('catalog.drawsPerGarment', { qty: formatQty(line.quantity * (1 + line.wastagePercent / 100), materialUnit(line)) }) }} ·
              <span :class="materialAvailable(line) < line.quantity ? 'text-error' : 'text-success'">
                {{ $t('catalog.availableQty', { qty: formatQty(materialAvailable(line), materialUnit(line)) }) }}
              </span>
            </p>
          </div>

          <div class="flex gap-2">
            <UButton icon="i-lucide-layers" size="sm" variant="subtle" class="flex-1" @click="addBomLine('FABRIC')">
              {{ $t('catalog.addFabricLine') }}
            </UButton>
            <UButton icon="i-lucide-scissors" size="sm" variant="subtle" class="flex-1" @click="addBomLine('ACCESSORY')">
              {{ $t('catalog.addAccessoryLine') }}
            </UButton>
          </div>
        </div>

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
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton
          icon="i-lucide-save"
          :loading="pending"
          :disabled="problems.length > 0"
          @click="save"
        >
          {{ isEdit ? $t('common.saveChanges') : $t('catalog.newType') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
