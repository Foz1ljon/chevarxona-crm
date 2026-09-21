import type { Config, DriveStep } from 'driver.js'
import type { Permission } from '#shared/utils/permissions'
import { NAVIGATION } from '~/utils/navigation'

/**
 * Guided product tour.
 *
 * Every step points at a `data-tour="<id>"` attribute somewhere in the markup
 * and takes its copy from `tour.steps.<id>` in the locale files, so a tour is
 * translated for free and a step whose element is not on screen (hidden by a
 * permission, a breakpoint or an empty state) is simply dropped instead of
 * pointing at nothing.
 *
 * ```ts
 * const tour = useTour()
 * tour.start()            // the tour for the current page
 * tour.start('overview')  // the "what is where" tour, available anywhere
 * ```
 */

export interface TourStep {
  /** Value of the `data-tour` attribute to highlight. */
  el: string
  /** i18n key suffix under `tour.steps.` — defaults to `el`. */
  key?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  /** Step is skipped when the signed-in user lacks this. */
  permission?: Permission | Permission[]
}

export interface TourDefinition {
  id: string
  /** Which page the tour belongs to. The overview tour matches nothing: it is started by name. */
  match?: (path: string) => boolean
  /** Runs before the steps are measured — used to unfold what a step points at. */
  prepare?: () => void
  steps: TourStep[] | (() => TourStep[])
}

/**
 * The menu tour is generated from `NAVIGATION` itself, so a new sidebar entry
 * joins the tour by declaring `tour: '<id>'` and a `tour.steps.<id>` message —
 * there is no second list to keep in step.
 */
function navigationSteps(): TourStep[] {
  const steps: TourStep[] = []

  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (item.tour) steps.push({ el: item.tour, side: 'right', align: 'start', permission: item.permission })

      for (const child of item.children ?? []) {
        if (child.tour) steps.push({ el: child.tour, side: 'right', align: 'start', permission: child.permission })
      }
    }
  }

  return steps
}

export const TOURS: TourDefinition[] = [
  {
    id: 'overview',
    steps: [
      { el: 'brand', side: 'right', align: 'start' },
      { el: 'sidebar', side: 'right', align: 'start' },
      { el: 'search', side: 'bottom', align: 'end' },
      { el: 'quick-add', side: 'bottom', align: 'end' },
      { el: 'notifications', side: 'bottom', align: 'end' },
      { el: 'language', side: 'bottom', align: 'end' },
      { el: 'theme', side: 'bottom', align: 'end' },
      { el: 'help', side: 'bottom', align: 'end' },
      { el: 'user-menu', side: 'top', align: 'start' }
    ]
  },
  {
    id: 'navigation',
    // Every group has to be unfolded first: a collapsed group keeps its
    // children out of the DOM, and a step cannot point at what is not there.
    prepare: () => {
      const open = useSidebarGroups()
      for (const section of NAVIGATION) {
        for (const item of section.items) {
          if (item.children?.length) open.value[item.label] = true
        }
      }
    },
    steps: navigationSteps
  },
  {
    id: 'dashboard',
    match: path => path === '/',
    steps: [
      { el: 'dashboard-kpis', side: 'bottom', align: 'start' },
      { el: 'dashboard-pipeline', side: 'top', align: 'start' },
      { el: 'dashboard-agenda', side: 'top', align: 'start' }
    ]
  },
  {
    id: 'orders',
    match: path => path === '/orders',
    steps: [
      { el: 'orders-filters', side: 'bottom', align: 'start' },
      { el: 'orders-board', side: 'top', align: 'center' },
      { el: 'orders-lane', side: 'right', align: 'start' },
      { el: 'orders-new', side: 'bottom', align: 'end', permission: 'orders:create' }
    ]
  },
  {
    id: 'order-new',
    match: path => path === '/orders/new',
    steps: [
      { el: 'new-order-client', side: 'bottom', align: 'start' },
      { el: 'new-order-items', side: 'top', align: 'start' },
      { el: 'new-order-summary', side: 'left', align: 'start' },
      { el: 'new-order-bom', side: 'left', align: 'start' },
      { el: 'new-order-submit', side: 'bottom', align: 'end' }
    ]
  },
  {
    id: 'orders-list',
    match: path => path === '/orders/list',
    steps: [
      { el: 'orders-list-filters', side: 'bottom', align: 'start' },
      { el: 'orders-list-flags', side: 'bottom', align: 'center' },
      { el: 'orders-list-table', side: 'top', align: 'center' }
    ]
  },
  {
    id: 'order-detail',
    match: path => /^\/orders\/[^/]+$/.test(path) && !['/orders/new', '/orders/list'].includes(path),
    steps: [
      { el: 'order-items', side: 'right', align: 'start' },
      { el: 'order-money', side: 'left', align: 'start' },
      { el: 'order-schedule', side: 'left', align: 'start' },
      { el: 'order-status', side: 'left', align: 'start', permission: 'orders:status_change' },
      { el: 'order-history', side: 'right', align: 'start' }
    ]
  },
  {
    id: 'clients',
    match: path => path === '/clients',
    steps: [
      { el: 'clients-search', side: 'bottom', align: 'start' },
      { el: 'clients-table', side: 'top', align: 'center' },
      { el: 'clients-new', side: 'bottom', align: 'end', permission: 'clients:create' }
    ]
  },
  {
    id: 'client-detail',
    match: path => /^\/clients\/[^/]+$/.test(path),
    steps: [
      { el: 'client-stats', side: 'bottom', align: 'start' },
      { el: 'client-measurements', side: 'right', align: 'start' },
      { el: 'client-measure', side: 'bottom', align: 'end', permission: 'clients:measurements' },
      { el: 'client-orders', side: 'left', align: 'start' }
    ]
  },
  {
    id: 'inventory',
    match: path => path === '/inventory',
    steps: [
      { el: 'material-filters', key: 'inventory-filters', side: 'bottom', align: 'start' },
      { el: 'material-table', key: 'inventory-table', side: 'top', align: 'center' },
      { el: 'inventory-add', side: 'bottom', align: 'end', permission: ['inventory:create', 'inventory:manage'] }
    ]
  },
  {
    id: 'accessories',
    match: path => path === '/inventory/accessories',
    steps: [
      { el: 'material-filters', key: 'accessories-filters', side: 'bottom', align: 'start' },
      { el: 'material-table', key: 'accessories-table', side: 'top', align: 'center' },
      { el: 'accessories-add', side: 'bottom', align: 'end', permission: ['inventory:create', 'inventory:manage'] }
    ]
  },
  {
    id: 'movements',
    match: path => path === '/inventory/movements',
    steps: [
      { el: 'movements-filters', side: 'bottom', align: 'start' },
      { el: 'movements-table', side: 'top', align: 'center' }
    ]
  },
  {
    id: 'catalog',
    match: path => path === '/settings/catalog',
    steps: [
      { el: 'catalog-grid', side: 'top', align: 'center' },
      { el: 'catalog-new', side: 'bottom', align: 'end', permission: 'catalog:manage' },
      { el: 'catalog-inactive', side: 'bottom', align: 'end' }
    ]
  },
  {
    id: 'staff',
    match: path => path === '/settings/staff',
    steps: [
      { el: 'staff-filters', side: 'bottom', align: 'start' },
      { el: 'staff-table', side: 'top', align: 'center' },
      { el: 'staff-add', side: 'bottom', align: 'end', permission: 'users:manage' }
    ]
  },
  {
    id: 'roles',
    match: path => path === '/settings/roles',
    steps: [
      { el: 'roles-list', side: 'right', align: 'start' },
      { el: 'roles-matrix', side: 'top', align: 'center' },
      { el: 'roles-save', side: 'bottom', align: 'end' }
    ]
  },
  {
    id: 'activity',
    match: path => path === '/settings/activity',
    steps: [
      { el: 'activity-filters', side: 'bottom', align: 'start' },
      { el: 'activity-table', side: 'top', align: 'center' }
    ]
  }
]

export function useTour() {
  const { t, te } = useI18n()
  const auth = useAuthStore()
  const route = useRoute()
  const toast = useToast()

  /** Tours the user has already finished, so nothing auto-starts twice. */
  const seen = useCookie<string[]>('chevar-tour-seen', {
    default: () => [],
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })

  const running = useState('tour-running', () => false)

  /** The tour that belongs to the page currently on screen, if any. */
  const pageTour = computed(() => TOURS.find(tour => tour.match?.(route.path)))

  function resolve(definition: TourDefinition): DriveStep[] {
    const steps: DriveStep[] = []
    const defined = typeof definition.steps === 'function' ? definition.steps() : definition.steps

    for (const step of defined) {
      if (step.permission && !auth.can(step.permission)) continue

      // Responsive markup often renders the same anchor twice (a desktop button
      // and its `sm:hidden` twin), so take the one that actually has a box:
      // anything hidden would frame empty space.
      const element = Array
        .from(document.querySelectorAll<HTMLElement>(`[data-tour="${step.el}"]`))
        .find((candidate) => {
          const { width, height } = candidate.getBoundingClientRect()
          return candidate.isConnected && (width > 0 || height > 0)
        })

      if (!element) continue

      const key = step.key ?? step.el
      steps.push({
        element,
        popover: {
          title: t(`tour.steps.${key}.title`),
          description: t(`tour.steps.${key}.body`),
          side: step.side ?? 'bottom',
          align: step.align ?? 'start'
        }
      })
    }

    return steps
  }

  function markSeen(id: string) {
    if (!seen.value.includes(id)) seen.value = [...seen.value, id]
  }

  /**
   * Starts a tour by id, or the current page's tour when called without one.
   * Resolves once the tour has been closed so callers can chain.
   */
  async function start(id?: string) {
    if (import.meta.server || running.value) return

    const definition = id
      ? TOURS.find(tour => tour.id === id)
      : pageTour.value ?? TOURS.find(tour => tour.id === 'overview')

    if (!definition) return

    definition.prepare?.()

    // The page may still be settling (a table that just finished fetching, a
    // sidebar that is animating open): wait for the next paint before measuring.
    await nextTick()

    const steps = resolve(definition)
    if (!steps.length) {
      toast.add({ title: t('tour.empty'), icon: 'i-lucide-compass', color: 'neutral' })
      return
    }

    const { driver } = await import('driver.js')

    running.value = true

    const config: Config = {
      steps,
      showProgress: steps.length > 1,
      progressText: '{{current}} / {{total}}',
      allowClose: true,
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: 'chevar-tour',
      nextBtnText: t('tour.next'),
      prevBtnText: t('tour.prev'),
      doneBtnText: t('tour.done'),
      onDestroyed: () => {
        running.value = false
        markSeen(definition.id)
      }
    }

    driver(config).drive()
  }

  /** Label for the "this page" entry — the page name when the page has a tour. */
  const pageTourLabel = computed(() => {
    const id = pageTour.value?.id
    const key = `tour.tours.${id}`
    return id && te(key) ? t(key) : t('tour.thisPage')
  })

  return {
    start,
    running: readonly(running),
    hasPageTour: computed(() => Boolean(pageTour.value)),
    pageTourLabel,
    hasSeen: (id: string) => seen.value.includes(id),
    markSeen,
    /** Forgets every tour so the welcome run happens again. */
    reset: () => { seen.value = [] }
  }
}
