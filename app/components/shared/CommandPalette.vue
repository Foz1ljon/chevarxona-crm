<script setup lang="ts">
import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { NAVIGATION } from '~/utils/navigation'

/**
 * Global ⌘K / Ctrl+K palette. Offers destinations the signed-in user can
 * actually open (the same permission filter the sidebar applies) plus live
 * search across clients and orders.
 */
const open = defineModel<boolean>('open', { default: false })

const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const tour = useTour()

function go(to: string) {
  open.value = false
  router.push(to)
}

const staticGroups = computed<CommandPaletteGroup[]>(() => {
  const pages: CommandPaletteItem[] = []

  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (item.to && (!item.permission || auth.can(item.permission))) {
        pages.push({
          id: `page:${item.to}`,
          label: t(item.label),
          icon: item.icon,
          onSelect: () => go(item.to!)
        })
      }

      for (const child of item.children ?? []) {
        if (!child.to || (child.permission && !auth.can(child.permission))) continue
        pages.push({
          id: `page:${child.to}`,
          label: t(child.label),
          icon: child.icon,
          onSelect: () => go(child.to!)
        })
      }
    }
  }

  const actions: CommandPaletteItem[] = []
  if (auth.can('orders:create')) {
    actions.push({ id: 'action:order', label: t('header.newOrder'), icon: 'i-lucide-file-plus', onSelect: () => go('/orders/new') })
  }
  if (auth.can('clients:create')) {
    actions.push({ id: 'action:client', label: t('header.newClient'), icon: 'i-lucide-user-plus', onSelect: () => go('/clients?new=1') })
  }
  if (auth.can('inventory:adjust')) {
    actions.push({ id: 'action:intake', label: t('header.stockIntake'), icon: 'i-lucide-package-plus', onSelect: () => go('/inventory?intake=1') })
  }

  // The tour highlights elements on the page underneath, so let the palette
  // finish closing before it starts measuring them.
  actions.push({
    id: 'action:tour',
    label: t('tour.help'),
    icon: 'i-lucide-circle-help',
    onSelect: () => {
      open.value = false
      setTimeout(() => tour.start(), 250)
    }
  })

  return [
    { id: 'pages', label: t('command.sections'), items: pages },
    ...(actions.length ? [{ id: 'actions', label: t('command.actions'), items: actions }] : [])
  ]
})

/* ---- Live records -------------------------------------------------- */

interface ClientHit { _id: string, fullName: string, phone: string }
interface OrderHit { _id: string, orderNumber: string, clientName: string }

const term = ref('')
const debouncedTerm = useDebounced(term, 250)
const searching = ref(false)
const clients = ref<ClientHit[]>([])
const orders = ref<OrderHit[]>([])

const canSearchClients = computed(() => auth.can('clients:read'))
const canSearchOrders = computed(() => auth.can(['orders:read', 'orders:read_assigned']))

// Only the newest request may write results — typing fast outruns the API.
let requestId = 0

watch(debouncedTerm, async (value) => {
  const needle = value.trim()

  if (needle.length < 2 || (!canSearchClients.value && !canSearchOrders.value)) {
    clients.value = []
    orders.value = []
    searching.value = false
    return
  }

  const id = ++requestId
  searching.value = true

  try {
    const [clientResult, orderResult] = await Promise.all([
      canSearchClients.value
        ? $fetch<{ items: ClientHit[] }>('/api/clients', { query: { search: needle, limit: 5, archived: 'false' } })
        : null,
      canSearchOrders.value
        ? $fetch<{ items: OrderHit[] }>('/api/orders', { query: { search: needle, limit: 5 } })
        : null
    ])

    if (id !== requestId) return
    clients.value = clientResult?.items ?? []
    orders.value = orderResult?.items ?? []
  } catch {
    if (id === requestId) {
      clients.value = []
      orders.value = []
    }
  } finally {
    if (id === requestId) searching.value = false
  }
})

const groups = computed<CommandPaletteGroup[]>(() => {
  const records: CommandPaletteGroup[] = []

  if (clients.value.length) {
    records.push({
      id: 'clients',
      label: t('command.clients'),
      items: clients.value.map(client => ({
        id: `client:${client._id}`,
        label: client.fullName,
        suffix: client.phone,
        icon: 'i-lucide-user',
        onSelect: () => go(`/clients/${client._id}`)
      }))
    })
  }

  if (orders.value.length) {
    records.push({
      id: 'orders',
      label: t('command.orders'),
      items: orders.value.map(order => ({
        id: `order:${order._id}`,
        label: order.orderNumber,
        suffix: order.clientName,
        icon: 'i-lucide-clipboard-list',
        onSelect: () => go(`/orders/${order._id}`)
      }))
    })
  }

  return [...records, ...staticGroups.value]
})

// A fresh palette should never open on a stale query.
watch(open, (value) => {
  if (!value) {
    term.value = ''
    clients.value = []
    orders.value = []
  }
})

defineShortcuts({
  meta_k: () => { open.value = !open.value },
  ctrl_k: () => { open.value = !open.value }
})
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'max-w-2xl p-0 overflow-hidden', overlay: 'backdrop-blur-sm' }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="term"
        :groups="groups"
        :loading="searching"
        :placeholder="$t('command.placeholder')"
        autofocus
        :ui="{ root: 'max-h-[26rem]' }"
      />
    </template>
  </UModal>
</template>
