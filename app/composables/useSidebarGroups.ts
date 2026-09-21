/**
 * Open/closed state of the collapsible sidebar groups, keyed by the group's
 * i18n label. It lives in shared state because two features need it: the
 * sidebar itself, and the guided tour, which unfolds every group before
 * walking the menu.
 */
export function useSidebarGroups() {
  return useState<Record<string, boolean>>('sidebar-groups', () => ({}))
}
