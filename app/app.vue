<script setup lang="ts">
import { en, ru, uz } from '@nuxt/ui/locale'

const { t, locale } = useI18n()

/** Nuxt UI ships its own dictionary; keep it in step with the app language. */
const UI_LOCALES = { uz, ru, en } as const
const uiLocale = computed(() => UI_LOCALES[locale.value as keyof typeof UI_LOCALES] ?? uz)

useHead({
  htmlAttrs: { lang: locale },
  link: [{ rel: 'icon', href: '/favicon.ico' }]
})

useSeoMeta({
  ogTitle: () => t('app.name'),
  description: () => t('app.description')
})
</script>

<template>
  <UApp :locale="uiLocale" :toaster="{ position: 'bottom-right', duration: 5000 }">
    <!-- Top progress bar: long fetches still feel immediate. -->
    <NuxtLoadingIndicator :height="3" color="var(--ui-primary)" />

    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
