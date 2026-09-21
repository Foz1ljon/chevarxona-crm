<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ public: true })

const rows = [
  { id: '1', name: 'Anvar Karimov', amount: 1200000 },
  { id: '2', name: 'Gulnora Abdullayeva', amount: 1700000 }
]

const columns: TableColumn<typeof rows[number]>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'amount', header: 'Amount' }
]
</script>

<template>
  <div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable :data="rows" :columns="columns" sticky="header" />
    </UCard>
  </div>
</template>
