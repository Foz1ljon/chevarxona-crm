// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt', '@nuxtjs/i18n'],

  // driver.js ships the tour popover's layout; `main.css` re-skins it.
  css: ['driver.js/dist/driver.css', '~/assets/css/main.css'],

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
      currency: process.env.NUXT_PUBLIC_CURRENCY || 'UZS',
      // Canonical origin for og:url / canonical links. Vercel exposes the
      // production domain itself, so a preview deploy still gets real URLs;
      // locally we fall back to the request origin in `app.vue`.
      siteUrl:
        process.env.NUXT_PUBLIC_SITE_URL
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
          : '')
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
      // Everything here is language-independent; the localised description,
      // Open Graph and canonical tags live in `app.vue` where `t()` exists.
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'application-name', content: 'Chevarxona CRM' },
        { name: 'apple-mobile-web-app-title', content: 'Chevarxona' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        // Phone numbers are rendered deliberately; let the app style them.
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'color-scheme', content: 'light dark' },
        // The browser chrome follows the active colour mode.
        { name: 'theme-color', media: '(prefers-color-scheme: light)', content: '#f8fafc' },
        { name: 'theme-color', media: '(prefers-color-scheme: dark)', content: '#0f172a' }
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ]
    }
  },

  typescript: {
    typeCheck: false,
    strict: true
  }
})
