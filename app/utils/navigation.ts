import type { Permission } from '#shared/utils/permissions'

export interface NavItem {
  /** i18n key, resolved at render time so the sidebar follows the locale. */
  label: string
  icon: string
  to?: string
  permission?: Permission | Permission[]
  badge?: string
  children?: NavItem[]
}

/** Sidebar definition. Entries are filtered by permission at render time. */
export const NAVIGATION: Array<{ label?: string, items: NavItem[] }> = [
  {
    items: [
      { label: 'nav.dashboard', icon: 'i-lucide-layout-dashboard', to: '/', permission: 'dashboard:read' }
    ]
  },
  {
    label: 'nav.workshop',
    items: [
      {
        label: 'nav.orders',
        icon: 'i-lucide-clipboard-list',
        permission: ['orders:read', 'orders:read_assigned'],
        children: [
          { label: 'nav.kanban', icon: 'i-lucide-columns-3', to: '/orders', permission: ['orders:read', 'orders:read_assigned'] },
          { label: 'nav.allOrders', icon: 'i-lucide-list', to: '/orders/list', permission: ['orders:read', 'orders:read_assigned'] },
          { label: 'nav.newOrder', icon: 'i-lucide-plus', to: '/orders/new', permission: 'orders:create' }
        ]
      },
      { label: 'nav.clients', icon: 'i-lucide-users', to: '/clients', permission: 'clients:read' }
    ]
  },
  {
    label: 'nav.warehouse',
    items: [
      {
        label: 'nav.inventory',
        icon: 'i-lucide-package',
        permission: 'inventory:read',
        children: [
          { label: 'nav.fabrics', icon: 'i-lucide-layers', to: '/inventory', permission: 'inventory:read' },
          { label: 'nav.accessories', icon: 'i-lucide-scissors', to: '/inventory/accessories', permission: 'inventory:read' },
          { label: 'nav.movements', icon: 'i-lucide-arrow-left-right', to: '/inventory/movements', permission: 'inventory:read' }
        ]
      },
      { label: 'nav.garmentTypes', icon: 'i-lucide-shirt', to: '/settings/catalog', permission: 'catalog:read' }
    ]
  },
  {
    label: 'nav.administration',
    items: [
      {
        label: 'nav.settings',
        icon: 'i-lucide-settings',
        permission: ['users:read', 'roles:manage', 'logs:read', 'catalog:manage'],
        children: [
          { label: 'nav.staff', icon: 'i-lucide-user-cog', to: '/settings/staff', permission: ['users:read', 'users:manage'] },
          { label: 'nav.rolesPermissions', icon: 'i-lucide-shield-check', to: '/settings/roles', permission: 'roles:manage' },
          { label: 'nav.activityLog', icon: 'i-lucide-history', to: '/settings/activity', permission: 'logs:read' }
        ]
      }
    ]
  }
]
