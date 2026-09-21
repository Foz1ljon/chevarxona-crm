// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n'],

  css: ['~/assets/css/main.css'],

  ui: {
    colorMode: true
  },

  i18n: {
    defaultLocale: 'uz',
    // No URL prefix: this is an internal tool, the choice belongs to the
    // person, not the address bar. It is remembered in a cookie.
    strategy: 'no_prefix',
    locales: [
      { code: 'uz', name: "O'zbekcha", language: 'uz-UZ', file: 'uz.json', icon: 'i-lucide-languages' },
      { code: 'ru', name: 'Русский', language: 'ru-RU', file: 'ru.json', icon: 'i-lucide-languages' },
      { code: 'en', name: 'English', language: 'en-GB', file: 'en.json', icon: 'i-lucide-languages' }
    ],
    // Language is picked explicitly in the header and remembered in a cookie by
    // `plugins/locale-cookie.ts`. Browser sniffing is deliberately off: with the
    // `no_prefix` strategy it can only run on the client, so an English-language
    // browser would render Uzbek on the server and English after hydration.
    detectBrowserLanguage: false
  },

  future: {
    compatibilityVersion: 4
  },

  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chevarxona',
    sessionPassword: process.env.NUXT_SESSION_PASSWORD || 'chevarxona-dev-session-password-change-me-32',
    seedOnBoot: process.env.SEED_ON_BOOT !== 'false',
    // One-shot switch: wipe business data and rebuild the demo workshop.
    seedReset: process.env.SEED_RESET === 'true',
    seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@chevarxona.uz',
    seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'admin123',
    public: {
      appName: 'Chevarxona CRM',
      currency: process.env.NUXT_PUBLIC_CURRENCY || 'UZS'
    }
  },

  nitro: {
    experimental: {
      asyncContext: true
    }
  },

  app: {
    head: {
      titleTemplate: '%s · Chevarxona CRM',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Custom tailoring & apparel manufacturing CRM' }
      ]
    }
  },

  typescript: {
    typeCheck: false,
    strict: true
  }
})
