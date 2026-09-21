<script setup lang="ts">
const emit = defineEmits<{ toggleSidebar: [], toggleCollapse: [] }>()

defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const route = useRoute()
const paletteOpen = useState('command-palette-open', () => false)

function openPalette() {
  paletteOpen.value = true
}

/** Quick actions are permission-gated so the button never leads to a 403. */
const { t } = useI18n()

const quickActions = computed(() => [
  { label: t('header.newOrder'), icon: 'i-lucide-file-plus', to: '/orders/new', permission: 'orders:create' as const },
  { label: t('header.newClient'), icon: 'i-lucide-user-plus', to: '/clients?new=1', permission: 'clients:create' as const },
  { label: t('header.stockIntake'), icon: 'i-lucide-package-plus', to: '/inventory?intake=1', permission: 'inventory:adjust' as const }
].filter(action => auth.can(action.permission)))

/** Section name for the top bar, derived from the first path segment. */
const SECTION_KEYS: Record<string, string> = {
  orders: 'nav.orders',
  clients: 'nav.clients',
  inventory: 'nav.inventory',
  settings: 'nav.settings'
}

const title = computed(() => {
  const segment = route.path.split('/').filter(Boolean)[0]
  return t(segment ? (SECTION_KEYS[segment] ?? 'nav.dashboard') : 'nav.dashboard')
})
</script>

<template>
  <header class="h-16 shrink-0 border-b border-default bg-default/80 backdrop-blur sticky top-0 z-30">
    <div class="h-full px-3 sm:px-5 flex items-center gap-2">
      <UButton
        icon="i-lucide-menu"
        color="neutral"
        variant="ghost"
        square
        class="lg:hidden"
        :aria-label="$t('nav.open')"
        @click="emit('toggleSidebar')"
      />

      <UButton
        :icon="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
        color="neutral"
        variant="ghost"
        square
        class="hidden lg:inline-flex"
        :aria-label="collapsed ? $t('nav.expand') : $t('nav.collapse')"
        @click="emit('toggleCollapse')"
      />

      <h1 class="text-sm font-semibold text-highlighted truncate">
        {{ title }}
      </h1>

      <div class="flex-1" />

      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-search"
        class="hidden sm:inline-flex"
        @click="openPalette"
      >
        <span class="text-muted">{{ $t('header.search') }}</span>
        <span class="ms-3 hidden md:inline-flex items-center rounded border border-default px-1.5 py-0.5 text-[10px] font-medium text-dimmed">
          ⌘K
        </span>
      </UButton>

      <UButton
        color="neutral"
        variant="ghost"
        square
        size="sm"
        icon="i-lucide-search"
        class="sm:hidden"
        :aria-label="$t('header.search')"
        @click="openPalette"
      />

      <UDropdownMenu
        v-if="quickActions.length"
        :items="[quickActions.map(action => ({ label: action.label, icon: action.icon, to: action.to }))]"
        :content="{ align: 'end' }"
      >
        <UButton icon="i-lucide-plus" size="sm" class="hidden sm:inline-flex">
          {{ $t('header.quickAdd') }}
        </UButton>
        <UButton icon="i-lucide-plus" size="sm" square class="sm:hidden" :aria-label="$t('header.quickAdd')" />
      </UDropdownMenu>

      <SharedColorModeToggle />

      <SharedLanguageSwitcher />

      <SharedNotificationCenter />
    </div>
  </header>
</template>
