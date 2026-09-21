/**
 * Single source of truth for the RBAC permission catalogue.
 * Used by the server guard (`requirePermission`) and the client
 * (`useRBAC`, `v-can`) so both sides can never drift apart.
 */

export const PERMISSION_GROUPS = {
  dashboard: {
    label: 'Dashboard',
    permissions: {
      'dashboard:read': 'View dashboard KPIs & pipeline'
    }
  },
  clients: {
    label: 'Clients',
    permissions: {
      'clients:read': 'View clients',
      'clients:create': 'Create clients',
      'clients:update': 'Edit clients',
      'clients:delete': 'Delete clients',
      'clients:measurements': 'Manage measurement profiles'
    }
  },
  orders: {
    label: 'Orders',
    permissions: {
      'orders:read': 'View orders',
      'orders:read_assigned': 'View only orders assigned to me',
      'orders:create': 'Create orders',
      'orders:update': 'Edit orders',
      'orders:delete': 'Delete orders',
      'orders:status_change': 'Advance order status',
      'orders:assign': 'Assign tailors to garments',
      'orders:payment': 'Register payments'
    }
  },
  inventory: {
    label: 'Inventory',
    permissions: {
      'inventory:read': 'View fabrics & accessories',
      'inventory:create': 'Add stock items',
      'inventory:update': 'Edit stock items',
      'inventory:delete': 'Delete stock items',
      'inventory:adjust': 'Stock intake & adjustments',
      'inventory:manage': 'Full inventory control'
    }
  },
  catalog: {
    label: 'Catalog',
    permissions: {
      'catalog:read': 'View garment categories',
      'catalog:manage': 'Manage garment categories & BOM templates'
    }
  },
  users: {
    label: 'Staff & Access',
    permissions: {
      'users:read': 'View staff',
      'users:manage': 'Create & edit staff accounts',
      'roles:manage': 'Manage roles & permissions'
    }
  },
  system: {
    label: 'System',
    permissions: {
      'reports:read': 'Financial reports',
      'logs:read': 'Activity logs',
      'settings:manage': 'Company settings'
    }
  }
} as const

export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS

export type Permission = {
  [K in PermissionGroupKey]: keyof (typeof PERMISSION_GROUPS)[K]['permissions']
}[PermissionGroupKey]

export const ALL_PERMISSIONS = Object.values(PERMISSION_GROUPS).flatMap(
  group => Object.keys(group.permissions)
) as Permission[]

export const PERMISSION_LABELS = Object.values(PERMISSION_GROUPS).reduce<Record<string, string>>(
  (acc, group) => Object.assign(acc, group.permissions),
  {}
)

export const ROLE_KEYS = ['SUPER_ADMIN', 'MANAGER', 'TAILOR', 'INVENTORY_CLERK'] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export const ROLE_META: Record<RoleKey, { label: string, description: string, color: string, icon: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Full system access including staff, settings, finance and audit logs.',
    color: 'error',
    icon: 'i-lucide-shield-check'
  },
  MANAGER: {
    label: 'Manager',
    description: 'Runs day-to-day operations: orders, clients, materials and tailor assignments.',
    color: 'primary',
    icon: 'i-lucide-clipboard-list'
  },
  TAILOR: {
    label: 'Tailor (Chevar)',
    description: 'Sees only assigned garments, updates progress and logs consumed materials.',
    color: 'info',
    icon: 'i-lucide-scissors'
  },
  INVENTORY_CLERK: {
    label: 'Inventory Clerk (Omborchi)',
    description: 'Owns fabrics, accessories, stock intake and material dispatch.',
    color: 'warning',
    icon: 'i-lucide-package'
  }
}

/** Default permission set granted when a role is first provisioned. */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  SUPER_ADMIN: [...ALL_PERMISSIONS],
  MANAGER: [
    'dashboard:read',
    'clients:read', 'clients:create', 'clients:update', 'clients:measurements',
    'orders:read', 'orders:create', 'orders:update', 'orders:status_change', 'orders:assign', 'orders:payment',
    'inventory:read', 'inventory:adjust',
    'catalog:read', 'catalog:manage',
    'users:read',
    'reports:read'
  ],
  TAILOR: [
    'dashboard:read',
    'orders:read_assigned',
    'orders:status_change',
    'clients:read',
    'inventory:read',
    'catalog:read'
  ],
  INVENTORY_CLERK: [
    'dashboard:read',
    'inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete', 'inventory:adjust', 'inventory:manage',
    'catalog:read',
    'orders:read'
  ]
}

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value)
}
