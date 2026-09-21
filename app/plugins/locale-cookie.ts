/**
 * Remembers the interface language in a cookie.
 *
 * The i18n module's own browser detection cannot be used here: this app runs
 * with `strategy: 'no_prefix'`, so detection only happens in the browser and an
 * English-language visitor would hydrate a different language than the one the
 * server rendered — a hydration mismatch on every page.
 *
 * Reading the cookie on both sides keeps the server render and the hydrating
 * client in step, and the watcher writes the choice back whenever it changes.
 */
export default defineNuxtPlugin({
  name: 'chevar:locale-cookie',
  dependsOn: ['i18n:plugin'],
  setup(nuxtApp) {
    const cookie = useCookie<string | null>('chevar-locale', {
      default: () => null,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365
    })

    const i18n = nuxtApp.$i18n
    if (!i18n) return

    const codes: string[] = (i18n.locales?.value ?? []).map(entry => entry.code)
    type LocaleCode = typeof i18n.locale.value

    // A stored choice wins over the default locale — on the server too, so both
    // renders agree. Setting `locale` directly (rather than `setLocale`) skips
    // the router navigation that a language change from the UI performs.
    if (cookie.value && codes.includes(cookie.value) && cookie.value !== i18n.locale.value) {
      i18n.locale.value = cookie.value as LocaleCode
    }

    watch(i18n.locale, (value) => {
      cookie.value = value
    })
  }
})
