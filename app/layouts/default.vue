<script setup lang="ts">
const mobileOpen = ref(false)
// Persisted so the layout choice survives a reload.
const collapsed = useCookie<boolean>('chevar-sidebar-collapsed', { default: () => false })
// Shared with the header button so both open the same ⌘K palette.
const paletteOpen = useState('command-palette-open', () => false)

const route = useRoute()
watch(() => route.fullPath, () => { mobileOpen.value = false })

/**
 * First sign-in: run the "where is what" tour once. The cookie behind
 * `hasSeen` keeps it from ever interrupting twice, and the short delay lets the
 * sidebar and header finish painting so the highlights land on real boxes.
 */
const tour = useTour()
onMounted(() => {
  if (tour.hasSeen('overview')) return
  const timer = setTimeout(() => tour.start('overview'), 900)
  onBeforeUnmount(() => clearTimeout(timer))
})
</script>

<template>
  <div class="min-h-screen bg-default text-default flex">
    <!-- Desktop sidebar -->
    <aside
      class="hidden lg:block shrink-0 transition-[width] duration-200"
      :class="collapsed ? 'w-16' : 'w-64'"
    >
      <div class="fixed inset-y-0 left-0 transition-[width] duration-200" :class="collapsed ? 'w-16' : 'w-64'">
        <SharedAppSidebar :collapsed="collapsed" />
      </div>
    </aside>

    <!-- Mobile drawer -->
    <USlideover v-model:open="mobileOpen" side="left" :ui="{ content: 'w-64 max-w-[80vw]' }">
      <template #content>
        <SharedAppSidebar @navigate="mobileOpen = false" />
      </template>
    </USlideover>

    <div class="flex-1 min-w-0 flex flex-col">
      <SharedAppHeader
        :collapsed="collapsed"
        @toggle-sidebar="mobileOpen = true"
        @toggle-collapse="collapsed = !collapsed"
      />

      <main class="flex-1 min-w-0">
        <slot />
      </main>
    </div>

    <SharedCommandPalette v-model:open="paletteOpen" />
  </div>
</template>
