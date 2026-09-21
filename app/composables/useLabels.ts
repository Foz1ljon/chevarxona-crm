import { ORDER_STATUS_META, ITEM_STATUS_META, type OrderStatus, type OrderItemStatus } from '#shared/utils/orderStatus'
import { ROLE_META, type RoleKey } from '#shared/utils/permissions'

/**
 * Translated labels for the domain enums.
 *
 * The shared constants stay the single source of truth for colour, icon and
 * ordering; only the human-readable text comes from the locale files, keyed by
 * the enum value. That way adding a language never touches domain logic.
 */
export function useLabels() {
  const { t, te } = useI18n()

  function orderStatus(status: OrderStatus | string) {
    const meta = ORDER_STATUS_META[status as OrderStatus]
    const key = `status.${status}`

    return {
      label: te(`${key}.label`) ? t(`${key}.label`) : (meta?.label ?? status),
      short: te(`${key}.short`) ? t(`${key}.short`) : (meta?.short ?? status),
      description: te(`${key}.description`) ? t(`${key}.description`) : (meta?.description ?? ''),
      color: meta?.color ?? 'neutral',
      icon: meta?.icon ?? 'i-lucide-circle'
    }
  }

  function itemStatus(status: OrderItemStatus | string) {
    const meta = ITEM_STATUS_META[status as OrderItemStatus]
    const key = `itemStatus.${status}`

    return {
      label: te(key) ? t(key) : (meta?.label ?? status),
      color: meta?.color ?? 'neutral',
      icon: meta?.icon ?? 'i-lucide-circle'
    }
  }

  function role(key: RoleKey | string) {
    const meta = ROLE_META[key as RoleKey]

    return {
      label: te(`role.${key}.label`) ? t(`role.${key}.label`) : (meta?.label ?? key),
      description: te(`role.${key}.description`) ? t(`role.${key}.description`) : (meta?.description ?? ''),
      color: meta?.color ?? 'neutral',
      icon: meta?.icon ?? 'i-lucide-shield'
    }
  }

  /** Falls back to the English text the server sent for unknown keys. */
  function permission(key: string, fallback = '') {
    return te(`perm.${key}`) ? t(`perm.${key}`) : (fallback || key)
  }

  function permissionGroup(key: string, fallback = '') {
    return te(`permGroup.${key}`) ? t(`permGroup.${key}`) : (fallback || key)
  }

  function priority(key: string) {
    return te(`priority.${key}`) ? t(`priority.${key}`) : key
  }

  function movementType(key: string) {
    return te(`movements.${key}`) ? t(`movements.${key}`) : key
  }

  return { orderStatus, itemStatus, role, permission, permissionGroup, priority, movementType }
}
