<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ public: true })

const rows = [{ id: '1', name: 'Anvar Karimov' }, { id: '2', name: 'Gulnora Abdullayeva' }]

const columns: TableColumn<typeof rows[number]>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'actions', header: '', enableSorting: false }
]
</script>

<template>
  <div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="rows" :columns="columns" sticky="header">
        <template #actions-cell="{ row }">
          <UDropdownMenu :items="[[{ label: 'Open', onSelect: () => row.original.id }]]">
            <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" square />
          </UDropdownMenu>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
