<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const props = defineProps<{ collapsed?: boolean }>()

const auth = useAuthStore()
const { initials } = useFormat()
const { role } = useLabels()
const { t } = useI18n()
const colorMode = useColorMode()

const roleMeta = computed(() => auth.user ? role(auth.user.roleKey) : null)

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (value) => { colorMode.preference = value ? 'dark' : 'light' }
})

const passwordOpen = ref(false)

const items = computed<DropdownMenuItem[][]>(() => [
  [{
    label: auth.user?.fullName ?? '',
    description: auth.user?.email,
    type: 'label' as const
  }],
  [
    {
      label: isDark.value ? t('header.lightMode') : t('header.darkMode'),
      icon: isDark.value ? 'i-lucide-sun' : 'i-lucide-moon',
      // Keep the menu open so the theme change is visible in place.
      onSelect: (event: Event) => {
        event.preventDefault()
        isDark.value = !isDark.value
      }
    },
    {
      label: t('auth.changePassword'),
      icon: 'i-lucide-key-round',
      onSelect: () => { passwordOpen.value = true }
    }
  ],
  [{
    label: t('auth.signOut'),
    icon: 'i-lucide-log-out',
    color: 'error' as const,
    onSelect: () => { auth.logout() }
  }]
])
</script>

<template>
  <div>
    <UDropdownMenu :items="items" :content="{ align: 'start', side: 'top' }" class="w-full">
      <button
        type="button"
        class="w-full flex items-center gap-2.5 rounded-md p-2 hover:bg-elevated transition-colors text-left"
        :class="props.collapsed ? 'justify-center' : ''"
      >
        <UAvatar
          :src="auth.user?.avatarUrl || undefined"
          :text="initials(auth.user?.fullName)"
          size="sm"
          :ui="{ root: 'bg-primary/15 text-primary ring-1 ring-primary/20' }"
        />
        <div v-if="!props.collapsed" class="min-w-0 flex-1">
          <p class="text-sm font-medium text-highlighted truncate leading-tight">
            {{ auth.user?.fullName }}
          </p>
          <p class="text-[11px] text-muted truncate leading-tight">
            {{ roleMeta?.label }}
          </p>
        </div>
        <UIcon v-if="!props.collapsed" name="i-lucide-chevrons-up-down" class="size-3.5 text-dimmed shrink-0" />
      </button>
    </UDropdownMenu>

    <SharedChangePasswordModal v-model:open="passwordOpen" />
  </div>
</template>
