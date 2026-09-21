<script setup lang="ts">
import type { GarmentCategory } from '~/composables/useCatalog'

definePageMeta({ permission: 'catalog:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.garmentTypes') })

const auth = useAuthStore()
const { categories, remove } = useCatalog()
const { formatMoney } = useFormat()
const toast = useApiToast()

const showInactive = ref(false)
const { data, refresh } = await categories({
  populate: true,
  active: 'all'
})

const visible = computed(() =>
  (data.value?.items ?? []).filter(category => showInactive.value || category.isActive)
)

const editorOpen = ref(false)
const editing = ref<GarmentCategory | null>(null)
const deleting = ref<GarmentCategory | null>(null)
const deletePending = ref(false)

function openCreate() {
  editing.value = null
  editorOpen.value = true
}

function openEdit(category: GarmentCategory) {
  editing.value = category
  editorOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return
  deletePending.value = true
  try {
    await remove(deleting.value._id)
    deleting.value = null
    await refresh()
  } catch (error) {
    toast.error(error, t('catalog.removeFailed'))
  } finally {
    deletePending.value = false
  }
}

/** Sums the template's material cost so pricing decisions have a floor. */
function templateCost(category: GarmentCategory) {
  return category.bomTemplate.reduce((sum, line) => {
    const material = typeof line.material === 'object' && line.material ? line.material : null
    if (!material) return sum
    return sum + line.quantity * (1 + (line.wastagePercent ?? 0) / 100) * (material.costPerUnit ?? 0)
  }, 0)
}
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.garmentTypes')"
      :description="$t('catalog.subtitle')"
      icon="i-lucide-shirt"
    >
      <template #actions>
        <USwitch v-model="showInactive" :label="$t('common.showInactive')" size="sm" class="mr-2" />
        <UButton v-if="$can('catalog:manage')" icon="i-lucide-plus" @click="openCreate">
          {{ $t('catalog.newType') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <SharedEmptyState
        v-if="!visible.length"
        icon="i-lucide-shirt"
        :title="$t('catalog.none')"
        :description="$t('catalog.noneHint')"
      >
        <UButton v-if="$can('catalog:manage')" icon="i-lucide-plus" @click="openCreate">
          {{ $t('catalog.newType') }}
        </UButton>
      </SharedEmptyState>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <UCard
          v-for="category in visible"
          :key="category._id"
          :class="category.isActive ? '' : 'opacity-60'"
        >
          <template #header>
            <div class="flex items-start gap-3">
              <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <UIcon :name="category.icon" class="size-5 text-primary" />
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="text-sm font-semibold text-highlighted truncate">
                  {{ category.name }}
                  <UBadge v-if="!category.isActive" :label="$t('common.inactive')" size="sm" variant="subtle" color="neutral" class="ml-1" />
                </h3>
                <p class="text-[11px] text-dimmed font-mono">
                  {{ category.slug }}
                </p>
              </div>

              <UDropdownMenu
                v-if="auth.can('catalog:manage')"
                :items="[[
                  { label: $t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(category) },
                  { label: category.isActive ? $t('inventory.deactivate') : $t('common.delete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect: () => (deleting = category) }
                ]]"
              >
                <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" square />
              </UDropdownMenu>
            </div>
          </template>

          <p v-if="category.description" class="text-sm text-muted line-clamp-2 mb-4">
            {{ category.description }}
          </p>

          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-[11px] text-muted uppercase tracking-wide">
                {{ $t('catalog.basePrice') }}
              </dt>
              <dd class="font-medium text-highlighted tabular-nums">
                {{ formatMoney(category.basePrice, false) }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] text-muted uppercase tracking-wide">
                {{ $t('catalog.leadTime') }}
              </dt>
              <dd class="font-medium text-highlighted">
                {{ $t('catalog.days', { n: category.estimatedDays }) }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] text-muted uppercase tracking-wide">
                {{ $t('measurements.title') }}
              </dt>
              <dd class="font-medium text-highlighted">
                {{ $t('catalog.measurementsCount', { n: category.measurementFields.length }) }}
              </dd>
            </div>
            <div>
              <dt class="text-[11px] text-muted uppercase tracking-wide">
                {{ $t('catalog.materialCost') }}
              </dt>
              <dd
                class="font-medium tabular-nums"
                :class="templateCost(category) > category.basePrice ? 'text-error' : 'text-highlighted'"
              >
                {{ formatMoney(templateCost(category), false) }}
              </dd>
            </div>
          </dl>

          <div v-if="category.bomTemplate.length" class="mt-4 pt-3 border-t border-default">
            <p class="text-[11px] text-muted uppercase tracking-wide mb-2">
              {{ $t('catalog.bom') }}
            </p>
            <ul class="space-y-1">
              <li
                v-for="(line, index) in category.bomTemplate.slice(0, 4)"
                :key="index"
                class="flex items-center gap-2 text-xs"
              >
                <UIcon
                  :name="line.materialType === 'FABRIC' ? 'i-lucide-layers' : 'i-lucide-scissors'"
                  class="size-3.5 text-dimmed shrink-0"
                />
                <span class="flex-1 min-w-0 truncate text-toned">{{ line.label }}</span>
                <span class="tabular-nums text-muted shrink-0">
                  {{ line.quantity }}{{ line.unit }}
                  <span v-if="line.wastagePercent" class="text-dimmed">+{{ line.wastagePercent }}%</span>
                </span>
              </li>
            </ul>
            <p v-if="category.bomTemplate.length > 4" class="text-[11px] text-dimmed mt-1.5">
              {{ $t('catalog.moreLines', { n: category.bomTemplate.length - 4 }) }}
            </p>
          </div>

          <SharedEmptyState
            v-else
            icon="i-lucide-package-x"
            :title="$t('catalog.noBom')"
            :description="$t('catalog.noBomHint')"
            compact
          />
        </UCard>
      </div>
    </div>

    <CatalogCategoryEditor
      v-model:open="editorOpen"
      :category="editing"
      @saved="refresh()"
    />

    <SharedConfirmModal
      :open="Boolean(deleting)"
      :title="deleting?.isActive ? $t('catalog.removeTitle') : $t('catalog.deleteTitle')"
      :description="$t('catalog.removeBody', { name: deleting?.name ?? '' })"
      :confirm-label="$t('common.remove')"
      :loading="deletePending"
      @update:open="value => !value && (deleting = null)"
      @confirm="confirmDelete"
    />
  </div>
</template>
