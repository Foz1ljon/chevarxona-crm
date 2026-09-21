<script setup lang="ts">
definePageMeta({ permission: 'inventory:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.accessories') })

const table = useTemplateRef('table')

const ACCESSORY_CATEGORIES = [
  'BUTTON', 'ZIPPER', 'THREAD', 'INTERLINING', 'ELASTIC',
  'LABEL', 'HANGER', 'BAG', 'LINING', 'HOOK', 'OTHER'
]
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('inventory.accessoriesTitle')"
      :description="$t('inventory.accessoriesSubtitle')"
      icon="i-lucide-scissors"
    >
      <template #actions>
        <UButton to="/inventory" icon="i-lucide-layers" color="neutral" variant="subtle">
          {{ $t('nav.fabrics') }}
        </UButton>
        <UButton
          v-if="$can(['inventory:create', 'inventory:manage'])"
          icon="i-lucide-plus"
          @click="table?.openCreate()"
        >
          {{ $t('inventory.addAccessory') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <InventoryMaterialTable
        ref="table"
        type="ACCESSORY"
        :type-options="ACCESSORY_CATEGORIES"
      />
    </div>
  </div>
</template>
