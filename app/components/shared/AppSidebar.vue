<script setup lang="ts">
import { NAVIGATION, type NavItem } from '~/utils/navigation'

const props = defineProps<{ collapsed?: boolean }>()
const emit = defineEmits<{ navigate: [] }>()

const route = useRoute()
const auth = useAuthStore()
const { t } = useI18n()

/**
 * Badge counts for nav rows, keyed by the row's i18n label. Only the warehouse
 * needs one today: items that dropped to their reorder threshold.
 */
const { data: lowStock } = await useFetch('/api/inventory/low-stock', {
  immediate: auth.can('inventory:read'),
  default: () => ({ total: 0 })
})

const badgeFor = computed<Record<string, number>>(() => {
  const badges: Record<string, number> = {}
  const total = lowStock.value?.total ?? 0

  if (total > 0 && auth.can('inventory:read')) {
    badges['nav.inventory'] = total
  }

  return badges
})

/** Drops entries the signed-in user has no permission for, groups included. */
const sections = computed(() =>
  NAVIGATION
    .map(section => ({
      ...section,
      items: section.items
        .map(item => ({
          ...item,
          children: item.children?.filter(child => !child.permission || auth.can(child.permission))
        }))
        .filter((item) => {
          if (item.permission && !auth.can(item.permission)) return false
          // A parent with children but none visible is itself pointless.
          return !item.children || item.children.length > 0
        })
    }))
    .filter(section => section.items.length > 0)
)

function isActive(item: NavItem): boolean {
  if (item.children?.length) return item.children.some(child => isActive(child))
  if (!item.to) return false
  return item.to === '/' ? route.path === '/' : route.path === item.to || route.path.startsWith(`${item.to}/`)
}

// Groups start open when they contain the current page.
const open = reactive<Record<string, boolean>>({})
watchEffect(() => {
  for (const section of sections.value) {
    for (const item of section.items) {
      if (item.children?.length && open[item.label] === undefined) {
        open[item.label] = isActive(item)
      }
    }
  }
})
</script>

<template>
  <div class="flex flex-col h-full bg-elevated/40 border-r border-default">
    <!-- Brand -->
    <div
      class="h-16 flex items-center gap-2.5 border-b border-default shrink-0"
      :class="props.collapsed ? 'justify-center px-2' : 'px-4'"
    >
      <div class="size-9 rounded-xl bg-primary ring-1 ring-primary/30 shadow-sm flex items-center justify-center shrink-0">
        <UIcon name="i-lucide-scissors" class="size-4.5 text-inverted" />
      </div>
      <div v-if="!props.collapsed" class="min-w-0">
        <p class="font-semibold text-sm text-highlighted truncate leading-tight">
          {{ $t('app.name') }}
        </p>
        <p class="text-[11px] text-muted truncate leading-tight">
          {{ $t('app.tagline') }}
        </p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto py-3 px-2 space-y-5" :aria-label="$t('nav.main')">
      <div v-for="(section, index) in sections" :key="section.label ?? index" class="space-y-1">
        <p
          v-if="section.label && !props.collapsed"
          class="px-2.5 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-dimmed"
        >
          {{ $t(section.label) }}
        </p>

        <template v-for="item in section.items" :key="item.label">
          <!-- Leaf -->
          <UTooltip v-if="!item.children?.length" :text="props.collapsed ? t(item.label) : ''" :disabled="!props.collapsed">
            <NuxtLink
              :to="item.to"
              class="group relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-150"
              :class="[
                props.collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2',
                isActive(item)
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-toned hover:bg-elevated hover:text-highlighted'
              ]"
              @click="emit('navigate')"
            >
              <span
                v-if="isActive(item) && !props.collapsed"
                class="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
              />
              <UIcon :name="item.icon" class="size-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105" />
              <span v-if="!props.collapsed" class="truncate">{{ $t(item.label) }}</span>
            </NuxtLink>
          </UTooltip>

          <!-- Group -->
          <div v-else>
            <UTooltip :text="props.collapsed ? t(item.label) : ''" :disabled="!props.collapsed">
              <button
                type="button"
                class="relative w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors"
                :class="[
                  props.collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2',
                  isActive(item) ? 'text-primary' : 'text-toned hover:bg-elevated hover:text-highlighted'
                ]"
                :aria-expanded="open[item.label] ?? false"
                @click="props.collapsed ? navigateTo(item.children![0]!.to!) : (open[item.label] = !open[item.label])"
              >
                <UIcon :name="item.icon" class="size-4.5 shrink-0" />
                <template v-if="!props.collapsed">
                  <span class="truncate flex-1 text-left">{{ $t(item.label) }}</span>
                  <UBadge
                    v-if="badgeFor[item.label]"
                    :label="String(badgeFor[item.label])"
                    color="warning"
                    variant="subtle"
                    size="sm"
                  />
                  <UIcon
                    name="i-lucide-chevron-down"
                    class="size-3.5 shrink-0 transition-transform duration-200"
                    :class="open[item.label] ? 'rotate-180' : ''"
                  />
                </template>
                <span
                  v-else-if="badgeFor[item.label]"
                  class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning"
                />
              </button>
            </UTooltip>

            <div v-if="!props.collapsed && open[item.label]" class="mt-1 ml-4 pl-3 border-l border-default/70 space-y-0.5">
              <NuxtLink
                v-for="child in item.children"
                :key="child.label"
                :to="child.to"
                class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors"
                :class="isActive(child)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted hover:bg-elevated hover:text-highlighted'"
                @click="emit('navigate')"
              >
                <UIcon :name="child.icon" class="size-4 shrink-0" />
                <span class="truncate">{{ $t(child.label) }}</span>
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>
    </nav>

    <div v-if="!props.collapsed" class="p-2 border-t border-default shrink-0">
      <SharedUserMenu />
    </div>
    <div v-else class="p-2 border-t border-default shrink-0 flex justify-center">
      <SharedUserMenu collapsed />
    </div>
  </div>
</template>
