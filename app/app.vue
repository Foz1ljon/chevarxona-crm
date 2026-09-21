<script setup lang="ts">
import { en, ru, uz } from '@nuxt/ui/locale'

const { t, locale } = useI18n()

/** Nuxt UI ships its own dictionary; keep it in step with the app language. */
const UI_LOCALES = { uz, ru, en } as const
const uiLocale = computed(() => UI_LOCALES[locale.value as keyof typeof UI_LOCALES] ?? uz)

/** og:locale wants a BCP-47 tag with an underscore. */
const OG_LOCALES = { uz: 'uz_UZ', ru: 'ru_RU', en: 'en_GB' } as const

const route = useRoute()
const { siteUrl } = useRuntimeConfig().public
// Locally (and on any host that has not set NUXT_PUBLIC_SITE_URL) the request
// itself tells us where we are, so canonical/og:url are never half-built.
const origin = (siteUrl || useRequestURL().origin).replace(/\/$/, '')
const canonical = computed(() => origin + route.path)

useHead({
  htmlAttrs: { lang: locale },
  link: [{ rel: 'canonical', href: canonical }]
})

useSeoMeta({
  // A page without its own title (error.vue) still reads as a real page:
  // the template turns this into "Tikuvchilik ustaxonasi · Chevarxona CRM".
  title: () => t('app.tagline'),
  description: () => t('app.description'),
  applicationName: () => t('app.name'),
  // Every route sits behind a session, so there is nothing for a crawler to
  // read. Flip this (and public/robots.txt) if a public page is ever added.
  robots: 'noindex, nofollow',
  ogType: 'website',
  ogSiteName: () => t('app.name'),
  ogTitle: () => t('app.name'),
  ogDescription: () => t('app.description'),
  ogUrl: canonical,
  ogLocale: () => OG_LOCALES[locale.value as keyof typeof OG_LOCALES] ?? 'uz_UZ',
  ogLocaleAlternate: () => Object.entries(OG_LOCALES)
    .filter(([code]) => code !== locale.value)
    .map(([, tag]) => tag),
  ogImage: `${origin}/og-image.jpg`,
  ogImageType: 'image/jpeg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => t('app.name'),
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('app.name'),
  twitterDescription: () => t('app.description'),
  twitterImage: `${origin}/og-image.jpg`,
  twitterImageAlt: () => t('app.name')
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
