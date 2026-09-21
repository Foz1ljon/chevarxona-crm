<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Fabric, Accessory } from '~/composables/useInventory'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  type: 'FABRIC' | 'ACCESSORY'
  material?: Fabric | Accessory | null
}>()

const emit = defineEmits<{ saved: [] }>()

const { create, update } = useInventory()
const toast = useApiToast()
const { t } = useI18n()

const isEdit = computed(() => Boolean(props.material?._id))
const isFabric = computed(() => props.type === 'FABRIC')
const pending = ref(false)

const FABRIC_TYPES = ['SILK', 'COTTON', 'WOOL', 'LINEN', 'CASHMERE', 'VELVET', 'POLYESTER', 'DENIM', 'SATIN', 'ATLAS', 'ADRAS', 'OTHER']
const ACCESSORY_CATEGORIES = ['BUTTON', 'ZIPPER', 'THREAD', 'INTERLINING', 'ELASTIC', 'LABEL', 'HANGER', 'BAG', 'LINING', 'HOOK', 'OTHER']
const ACCESSORY_UNITS = ['pcs', 'spool', 'pack', 'm', 'set', 'roll']

const schema = computed(() => {
  const base = {
    name: z.string().trim().min(2, t('validation.nameMin')),
    sku: z.string().trim().min(2, t('validation.skuRequired')),
    color: z.string().trim().default(''),
    minThreshold: z.coerce.number().min(0),
    costPerUnit: z.coerce.number().min(0),
    supplier: z.string().trim().default(''),
    location: z.string().trim().default(''),
    notes: z.string().trim().default('')
  }

  return isFabric.value
    ? z.object({
        ...base,
        fabricType: z.enum(FABRIC_TYPES as [string, ...string[]]),
        pattern: z.string().trim().default(''),
        colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, t('validation.colourHex')),
        unit: z.enum(['m', 'yd'])
      })
    : z.object({
        ...base,
        category: z.enum(ACCESSORY_CATEGORIES as [string, ...string[]]),
        size: z.string().trim().default(''),
        unit: z.enum(ACCESSORY_UNITS as [string, ...string[]])
      })
})

/** Union of both material shapes — the irrelevant half stays undefined. */
interface MaterialState {
  name: string
  sku: string
  color: string
  minThreshold: number
  costPerUnit: number
  supplier: string
  location: string
  notes: string
  unit: string
  stockQty?: number
  fabricType?: string
  pattern?: string
  colorHex?: string
  category?: string
  size?: string
}

const state = reactive<MaterialState>({
  name: '', sku: '', color: '', minThreshold: 0, costPerUnit: 0,
  supplier: '', location: '', notes: '', unit: 'm'
})
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return

  const material = props.material as Record<string, never> | null | undefined

  Object.assign(state, {
    name: material?.name ?? '',
    sku: material?.sku ?? '',
    color: material?.color ?? '',
    minThreshold: material?.minThreshold ?? (isFabric.value ? 5 : 20),
    costPerUnit: material?.costPerUnit ?? 0,
    supplier: material?.supplier ?? '',
    location: material?.location ?? '',
    notes: material?.notes ?? '',
    ...(isFabric.value
      ? {
          fabricType: material?.fabricType ?? 'COTTON',
          pattern: material?.pattern ?? '',
          colorHex: material?.colorHex ?? '#94a3b8',
          unit: material?.unit ?? 'm'
        }
      : {
          category: material?.category ?? 'OTHER',
          size: material?.size ?? '',
          unit: material?.unit ?? 'pcs'
        }),
    // Opening stock is only offered on create — afterwards quantity moves
    // exclusively through the adjustment ledger.
    ...(isEdit.value ? {} : { stockQty: 0 })
  })
})

async function onSubmit(event: FormSubmitEvent<Record<string, unknown>>) {
  // `stockQty` is create-only, so it rides alongside the validated payload.
  pending.value = true
  try {
    const body = { ...event.data, ...(isEdit.value ? {} : { stockQty: state.stockQty ?? 0 }) }

    if (isEdit.value) {
      await update(props.type, props.material!._id, body)
    } else {
      await create(props.type, body)
    }

    emit('saved')
    open.value = false
  } catch (error) {
    const parsed = toast.error(error, t('inventory.saveFailed'))
    if (parsed.fieldErrors.length) form.value?.setErrors(parsed.fieldErrors)
  } finally {
    pending.value = false
  }
}

const modalTitle = computed(() => {
  if (isFabric.value) return isEdit.value ? t('inventory.editFabric') : t('inventory.newFabric')
  return isEdit.value ? t('inventory.editAccessory') : t('inventory.newAccessory')
})

const modalDescription = computed(() => {
  if (isEdit.value) return t('inventory.editHint')
  return isFabric.value ? t('inventory.newFabricHint') : t('inventory.newAccessoryHint')
})

const submitLabel = computed(() => {
  if (isEdit.value) return t('common.saveChanges')
  return isFabric.value ? t('inventory.addFabric') : t('inventory.addAccessory')
})
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UForm ref="form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('common.name')" name="name" required class="sm:col-span-2">
            <UInput
              v-model="state.name"
              :placeholder="isFabric ? $t('inventory.namePlaceholderFabric') : $t('inventory.namePlaceholderAccessory')"
              class="w-full"
              autofocus
            />
          </UFormField>

          <UFormField :label="$t('inventory.sku')" name="sku" required>
            <UInput v-model="state.sku" :placeholder="isFabric ? $t('inventory.skuPlaceholderFabric') : $t('inventory.skuPlaceholderAccessory')" class="w-full font-mono" />
          </UFormField>

          <UFormField v-if="isFabric" :label="$t('inventory.fabricType')" name="fabricType" required>
            <USelect
              v-model="state.fabricType"
              :items="FABRIC_TYPES.map(value => ({ label: $t('fabricType.' + value), value }))"
              class="w-full"
            />
          </UFormField>

          <UFormField v-else :label="$t('inventory.category')" name="category" required>
            <USelect
              v-model="state.category"
              :items="ACCESSORY_CATEGORIES.map(value => ({ label: $t('accessoryCategory.' + value), value }))"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('common.unit')" name="unit" required>
            <USelect
              v-model="state.unit"
              :items="(isFabric ? ['m', 'yd'] : ACCESSORY_UNITS).map(value => ({ label: value, value }))"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('inventory.colour')" name="color">
            <UInput v-model="state.color" class="w-full" />
          </UFormField>

          <UFormField v-if="isFabric" :label="$t('inventory.pattern')" name="pattern">
            <UInput v-model="state.pattern" :placeholder="$t('inventory.patternPlaceholder')" class="w-full" />
          </UFormField>

          <UFormField v-else :label="$t('inventory.size')" name="size">
            <UInput v-model="state.size" placeholder="20mm, 60cm…" class="w-full" />
          </UFormField>

          <UFormField v-if="isFabric" :label="$t('inventory.swatch')" name="colorHex">
            <div class="flex items-center gap-2">
              <input
                v-model="state.colorHex"
                type="color"
                class="size-9 rounded-md ring ring-default cursor-pointer bg-transparent"
                :aria-label="$t('inventory.swatch')"
              >
              <UInput v-model="state.colorHex" class="flex-1 font-mono" />
            </div>
          </UFormField>

          <UFormField v-if="!isEdit" :label="$t('inventory.openingStock')" name="stockQty" :hint="$t('inventory.openingStockHint')">
            <UInputNumber v-model="state.stockQty" :min="0" :step="1" class="w-full" />
          </UFormField>

          <UFormField :label="$t('inventory.reorderThreshold')" name="minThreshold" required :hint="$t('inventory.reorderHint')">
            <UInputNumber v-model="state.minThreshold" :min="0" class="w-full" />
          </UFormField>

          <UFormField :label="$t('inventory.costPerUnit')" name="costPerUnit" required>
            <UInputNumber v-model="state.costPerUnit" :min="0" :step="1000" class="w-full" />
          </UFormField>

          <UFormField :label="$t('inventory.supplier')" name="supplier">
            <UInput v-model="state.supplier" class="w-full" />
          </UFormField>

          <UFormField :label="$t('inventory.shelfLocation')" name="location">
            <UInput v-model="state.location" placeholder="A1-03" class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.notes')" name="notes" class="sm:col-span-2">
            <UTextarea v-model="state.notes" :rows="2" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="pending" :icon="isEdit ? 'i-lucide-save' : 'i-lucide-plus'">
            {{ submitLabel }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
