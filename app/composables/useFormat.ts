/**
 * Presentation helpers shared across tables, cards and the Kanban board.
 *
 * Every string is assembled from the tables below instead of `Intl`. ICU data
 * differs between Node and each browser — `uz-UZ` alone renders `1 200 000` on
 * the server and `1,200,000` in Chrome — and those differences showed up as
 * hydration mismatches inside every table cell. Building the output ourselves
 * also keeps dates pinned to the workshop's wall clock (Asia/Tashkent) rather
 * than to whichever timezone the server or the browser happens to use.
 */

/** Workshop timezone: UTC+5 all year, so a fixed offset is exact. */
const APP_UTC_OFFSET_MS = 5 * 60 * 60 * 1000

type Locale = 'uz' | 'ru' | 'en'

interface NumberStyle {
  group: string
  decimal: string
  compact: [string, string, string]
}

interface DateStyle {
  longMonths: string[]
  shortMonths: string[]
  /** Uzbek joins the day to the month: `15-sentabr 2026`. */
  hyphenatedDay: boolean
}

const NUMBERS: Record<Locale, NumberStyle> = {
  uz: { group: ' ', decimal: ',', compact: ['ming', 'mln', 'mlrd'] },
  ru: { group: ' ', decimal: ',', compact: ['тыс.', 'млн', 'млрд'] },
  en: { group: ',', decimal: '.', compact: ['K', 'M', 'B'] }
}

const DATES: Record<Locale, DateStyle> = {
  uz: {
    longMonths: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
    shortMonths: ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'],
    hyphenatedDay: true
  },
  ru: {
    longMonths: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
    shortMonths: ['янв.', 'февр.', 'мар.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'],
    hyphenatedDay: false
  },
  en: {
    longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    hyphenatedDay: false
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Shifts a date into workshop time and reads it back with the UTC getters, so
 * the same calendar day comes out on the server and in any browser.
 */
function appDate(value?: string | Date | null): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(date.getTime() + APP_UTC_OFFSET_MS)
}

/** Whole days between the workshop's today and the given date. */
function dayIndex(value: Date) {
  return Math.floor(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()) / 86_400_000)
}

function groupDigits(value: number, style: NumberStyle, maxDecimals: number, minDecimals = 0) {
  const negative = value < 0
  const [whole, fraction = ''] = Math.abs(value).toFixed(maxDecimals).split('.')

  let decimals = fraction.replace(/0+$/, '')
  while (decimals.length < minDecimals) decimals += '0'

  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, style.group)
  const body = decimals ? `${grouped}${style.decimal}${decimals}` : grouped

  return negative ? `-${body}` : body
}

export function useFormat() {
  const { currency } = useRuntimeConfig().public
  const { t, locale } = useI18n()

  const key = computed<Locale>(() => (locale.value as Locale) ?? 'uz')
  const numbers = computed(() => NUMBERS[key.value] ?? NUMBERS.uz)
  const dates = computed(() => DATES[key.value] ?? DATES.uz)

  function formatMoney(value?: number | null, withCurrency = true) {
    const amount = groupDigits(Math.round(value ?? 0), numbers.value, 0)
    return withCurrency ? `${amount} ${currency}` : amount
  }

  /** Compacts large sums for KPI tiles: 12 400 000 → "12,4 mln". */
  function formatMoneyCompact(value?: number | null) {
    const amount = Math.round(value ?? 0)
    const abs = Math.abs(amount)
    const units = numbers.value.compact

    if (abs >= 1_000_000_000) return `${groupDigits(amount / 1_000_000_000, numbers.value, 1)} ${units[2]}`
    if (abs >= 1_000_000) return `${groupDigits(amount / 1_000_000, numbers.value, 1)} ${units[1]}`
    if (abs >= 1_000) return `${groupDigits(amount / 1_000, numbers.value, 1)} ${units[0]}`
    return groupDigits(amount, numbers.value, 0)
  }

  function formatQty(value?: number | null, unit = '') {
    const qty = groupDigits(value ?? 0, numbers.value, 2)
    return unit ? `${qty} ${unit}` : qty
  }

  function formatDate(value?: string | Date | null) {
    const date = appDate(value)
    if (!date) return '—'

    const day = pad(date.getUTCDate())
    const month = dates.value.longMonths[date.getUTCMonth()] ?? ''
    const year = date.getUTCFullYear()

    return dates.value.hyphenatedDay ? `${day}-${month} ${year}` : `${day} ${month} ${year}`
  }

  function formatDateTime(value?: string | Date | null) {
    const date = appDate(value)
    if (!date) return '—'
    return `${formatDate(date)} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
  }

  /** `2026-09` → `sen` for the revenue chart axis. */
  function formatMonthShort(value?: string | null) {
    if (!value) return ''
    const [year, month] = value.split('-')
    const index = Number(month) - 1
    if (!year || Number.isNaN(index) || index < 0 || index > 11) return value
    return dates.value.shortMonths[index] ?? value
  }

  /** "in 3 days" / "2 days ago" — drives the deadline pills. */
  function formatRelative(value?: string | Date | null) {
    const date = appDate(value)
    if (!date) return '—'

    const today = appDate(new Date())!
    const days = dayIndex(date) - dayIndex(today)

    if (days === 0) return t('common.today')
    if (days === 1) return t('common.tomorrow')
    if (days === -1) return t('common.yesterday')
    if (days > 0) {
      return days < 30
        ? t('common.inDays', { n: days })
        : t('common.inMonths', { n: Math.round(days / 30) })
    }
    const ago = Math.abs(days)
    return ago < 30
      ? t('common.daysAgo', { n: ago })
      : t('common.monthsAgo', { n: Math.round(ago / 30) })
  }

  function daysUntil(value?: string | Date | null) {
    const date = appDate(value)
    if (!date) return null
    return dayIndex(date) - dayIndex(appDate(new Date())!)
  }

  function initials(name?: string | null) {
    if (!name) return '??'
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('')
  }

  /** `2026-09-20` — the value format <UInput type="date"> expects. */
  function toDateInput(value?: string | Date | null) {
    const date = appDate(value ?? new Date())
    if (!date) return ''
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  }

  return {
    currency,
    formatMoney,
    formatMoneyCompact,
    formatQty,
    formatDate,
    formatDateTime,
    formatMonthShort,
    formatRelative,
    daysUntil,
    initials,
    toDateInput
  }
}
