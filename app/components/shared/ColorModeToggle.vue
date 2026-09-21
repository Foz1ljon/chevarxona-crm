<script setup lang="ts">
/**
 * Light/dark switch. Nuxt UI drives the `dark` class through
 * `@nuxtjs/color-mode`, so we only steer `preference` — the module keeps the
 * choice in a cookie and in localStorage.
 *
 * Both icons are always rendered and CSS picks one: the `dark` class lands on
 * <html> before hydration, so the toggle never renders a different icon on the
 * server than on the client (which would be a hydration mismatch).
 */
const colorMode = useColorMode()

function toggle() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <UTooltip :text="$t('header.theme')">
    <UButton
      color="neutral"
      variant="ghost"
      square
      size="sm"
      :aria-label="$t('header.theme')"
      @click="toggle"
    >
      <UIcon name="i-lucide-moon" class="size-4 dark:hidden" />
      <UIcon name="i-lucide-sun" class="hidden size-4 dark:block" />
    </UButton>
  </UTooltip>
</template>
