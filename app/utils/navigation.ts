import type { Permission } from '#shared/utils/permissions'

export interface NavItem {
  /** i18n key, resolved at render time so the sidebar follows the locale. */
  label: string
  icon: string
  to?: string
  permission?: Permission | Permission[]
  badge?: string
  /**
   * Anchor for the guided tour: the sidebar renders it as `data-tour` and
   * `useTour` walks this list to build the "what is in the menu" tour, with the
   * copy coming from `tour.steps.<id>`. See `app/composables/useTour.ts`.
   */
  tour?: string
  children?: NavItem[]
}

/** Sidebar definition. Entries are filtered by permission at render time. */
export const NAVIGATION: Array<{ label?: string, items: NavItem[] }> = [
  {
    items: [
      { label: 'nav.dashboard', icon: 'i-lucide-layout-dashboard', to: '/', permission: 'dashboard:read', tour: 'nav-dashboard' }
    ]
  },
  {
    label: 'nav.workshop',
    items: [
      {
        label: 'nav.orders',
        icon: 'i-lucide-clipboard-list',
        permission: ['orders:read', 'orders:read_assigned'],
        tour: 'nav-orders',
        children: [
          { label: 'nav.kanban', icon: 'i-lucide-columns-3', to: '/orders', permission: ['orders:read', 'orders:read_assigned'], tour: 'nav-orders-board' },
          { label: 'nav.allOrders', icon: 'i-lucide-list', to: '/orders/list', permission: ['orders:read', 'orders:read_assigned'], tour: 'nav-orders-list' },
          { label: 'nav.newOrder', icon: 'i-lucide-plus', to: '/orders/new', permission: 'orders:create', tour: 'nav-orders-new' }
        ]
      },
      { label: 'nav.clients', icon: 'i-lucide-users', to: '/clients', permission: 'clients:read', tour: 'nav-clients' }
    ]
  },
  {
    label: 'nav.warehouse',
    items: [
      {
        label: 'nav.inventory',
        icon: 'i-lucide-package',
        permission: 'inventory:read',
        tour: 'nav-inventory',
        children: [
          { label: 'nav.fabrics', icon: 'i-lucide-layers', to: '/inventory', permission: 'inventory:read', tour: 'nav-fabrics' },
          { label: 'nav.accessories', icon: 'i-lucide-scissors', to: '/inventory/accessories', permission: 'inventory:read', tour: 'nav-accessories' },
          { label: 'nav.movements', icon: 'i-lucide-arrow-left-right', to: '/inventory/movements', permission: 'inventory:read', tour: 'nav-movements' }
        ]
      },
      { label: 'nav.garmentTypes', icon: 'i-lucide-shirt', to: '/settings/catalog', permission: 'catalog:read', tour: 'nav-catalog' }
    ]
  },
  {
    label: 'nav.administration',
    items: [
      {
        label: 'nav.settings',
        icon: 'i-lucide-settings',
        permission: ['users:read', 'roles:manage', 'logs:read', 'catalog:manage'],
        tour: 'nav-settings',
        children: [
          { label: 'nav.staff', icon: 'i-lucide-user-cog', to: '/settings/staff', permission: ['users:read', 'users:manage'], tour: 'nav-staff' },
          { label: 'nav.rolesPermissions', icon: 'i-lucide-shield-check', to: '/settings/roles', permission: 'roles:manage', tour: 'nav-roles' },
          { label: 'nav.activityLog', icon: 'i-lucide-history', to: '/settings/activity', permission: 'logs:read', tour: 'nav-activity' }
        ]
      }
    ]
  }
]
