<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

definePageMeta({ public: true })

const rows = [
  { id: '1', name: 'Anvar Karimov', amount: 1200000 },
  { id: '2', name: 'Gulnora Abdullayeva', amount: 1700000 }
]

const columns: TableColumn<typeof rows[number]>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'amount', header: 'Amount', meta: { class: { th: 'text-right', td: 'text-right' } } },
  { id: 'actions', header: '', enableSorting: false }
]

const sorting = ref<Array<{ id: string, desc: boolean }>>([])
</script>

<template>
  <div>
    <UCard :ui="{ body: 'p-0 sm:p-0' }">
      <UTable
        v-model:sorting="sorting"
        :data="rows"
        :columns="columns"
        sticky="header"
        :ui="{ tr: 'hover:bg-elevated/50' }"
      >
        <template #name-cell="{ row }">
          <NuxtLink :to="`/clients/${row.original.id}`" class="flex items-center gap-3 group">
            <span class="size-8 rounded-full bg-primary/10 text-primary">{{ row.original.name[0] }}</span>
            <p class="font-medium text-highlighted">{{ row.original.name }}</p>
          </NuxtLink>
        </template>

        <template #amount-cell="{ row }">
          <span class="tabular-nums text-sm">{{ row.original.amount }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div @click.stop>
            <UDropdownMenu :items="[[{ label: 'Open', icon: 'i-lucide-external-link', to: `/clients/${row.original.id}` }]]">
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" square />
            </UDropdownMenu>
          </div>
        </template>
      </UTable>
    </UCard>
  </div>
</template>
