<script setup lang="ts">
definePageMeta({ permission: 'inventory:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.fabrics') })

const route = useRoute()
const table = useTemplateRef('table')

const FABRIC_TYPES = [
  'SILK', 'COTTON', 'WOOL', 'LINEN', 'CASHMERE', 'VELVET',
  'POLYESTER', 'DENIM', 'SATIN', 'ATLAS', 'ADRAS', 'OTHER'
]
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('inventory.fabricsTitle')"
      :description="$t('inventory.fabricsSubtitle')"
      icon="i-lucide-layers"
    >
      <template #actions>
        <UButton to="/inventory/accessories" icon="i-lucide-scissors" color="neutral" variant="subtle">
          {{ $t('nav.accessories') }}
        </UButton>
        <UButton
          v-if="$can(['inventory:create', 'inventory:manage'])"
          icon="i-lucide-plus"
          @click="table?.openCreate()"
        >
          {{ $t('inventory.addFabric') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <InventoryMaterialTable
        ref="table"
        type="FABRIC"
        :type-options="FABRIC_TYPES"
        :auto-intake="route.query.intake === '1'"
      />
    </div>
  </div>
</template>
