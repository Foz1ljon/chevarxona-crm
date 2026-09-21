<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const { locale, locales, setLocale } = useI18n()

const current = computed(() =>
  (locales.value as Array<{ code: string, name?: string }>).find(entry => entry.code === locale.value)
)

const items = computed<DropdownMenuItem[][]>(() => [
  (locales.value as Array<{ code: string, name?: string }>).map(entry => ({
    label: entry.name ?? entry.code,
    icon: entry.code === locale.value ? 'i-lucide-check' : undefined,
    onSelect: () => { setLocale(entry.code as never) }
  }))
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UButton
      icon="i-lucide-languages"
      color="neutral"
      variant="ghost"
      size="sm"
      :aria-label="$t('header.language')"
    >
      <span class="hidden sm:inline">{{ current?.name ?? locale }}</span>
    </UButton>
  </UDropdownMenu>
</template>
