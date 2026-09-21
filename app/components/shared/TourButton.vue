<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/**
 * Entry point for the guided tour. One click runs the tour for the page you
 * are on; the menu also holds the "where is what" walkthrough of the shell.
 */
const { t } = useI18n()
const tour = useTour()

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: tour.pageTourLabel.value,
      icon: 'i-lucide-route',
      disabled: !tour.hasPageTour.value,
      onSelect: () => { tour.start() }
    },
    {
      label: t('tour.overview'),
      icon: 'i-lucide-compass',
      onSelect: () => { tour.start('overview') }
    },
    {
      label: t('tour.tours.navigation'),
      icon: 'i-lucide-list-tree',
      onSelect: () => { tour.start('navigation') }
    }
  ]
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'end' }">
    <UTooltip :text="$t('tour.help')">
      <UButton
        icon="i-lucide-circle-help"
        color="neutral"
        variant="ghost"
        square
        size="sm"
        :aria-label="$t('tour.help')"
      />
    </UTooltip>
  </UDropdownMenu>
</template>
