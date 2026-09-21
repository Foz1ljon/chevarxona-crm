<script setup lang="ts">
import type { Client, MeasurementProfile } from '~/composables/useClients'

definePageMeta({ permission: 'clients:read' })

const route = useRoute()
const clientId = computed(() => route.params.id as string)

const { get, measurements } = useClients()
const { formatMoney, formatDate, formatDateTime, initials } = useFormat()
const { t } = useI18n()

const { data, refresh } = await get(clientId)
const client = computed(() => data.value?.client as Client | undefined)

useHead({ title: () => client.value?.fullName ?? t('orders.client') })

const editOpen = ref(false)
const measureOpen = ref(false)

/* ---- Measurement history --------------------------------------------- */

const showHistory = ref(false)
const profiles = ref<MeasurementProfile[]>([])
const loadingProfiles = ref(false)

async function loadProfiles() {
  loadingProfiles.value = true
  try {
    const result = await measurements(clientId.value, !showHistory.value)
    profiles.value = result.profiles
  } finally {
    loadingProfiles.value = false
  }
}

watch([clientId, showHistory], loadProfiles, { immediate: true })

async function onMeasurementSaved() {
  await Promise.all([refresh(), loadProfiles()])
}

/** Groups revisions under their profile name for the accordion. */
const groupedProfiles = computed(() => {
  const groups = new Map<string, MeasurementProfile[]>()
  for (const profile of profiles.value) {
    const list = groups.get(profile.name) ?? []
    list.push(profile)
    groups.set(profile.name, list)
  }
  return [...groups.entries()].map(([name, revisions]) => ({
    name,
    revisions: revisions.sort((a, b) => b.version - a.version)
  }))
})
</script>

<template>
  <div v-if="client">
    <SharedPageHeader :title="client.fullName" back-to="/clients">
      <template #actions>
        <UButton
          v-if="$can('clients:measurements')"
          icon="i-lucide-ruler"
          variant="subtle"
          color="neutral"
          data-tour="client-measure"
          @click="() => { measureOpen = true }"
        >
          {{ $t('clients.takeMeasurements') }}
        </UButton>
        <UButton v-if="$can('clients:update')" icon="i-lucide-pencil" variant="subtle" color="neutral" @click="() => { editOpen = true }">
          {{ $t('common.edit') }}
        </UButton>
        <UButton v-if="$can('orders:create')" :to="`/orders/new?client=${client._id}`" icon="i-lucide-plus">
          {{ $t('header.newOrder') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-4 text-sm">
        <span class="flex items-center gap-1.5 text-toned">
          <UIcon name="i-lucide-phone" class="size-4 text-dimmed" />
          {{ client.phone }}
        </span>
        <span v-if="client.secondaryPhone" class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-phone-call" class="size-4 text-dimmed" />
          {{ client.secondaryPhone }}
        </span>
        <span v-if="client.telegramId" class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-send" class="size-4 text-dimmed" />
          {{ client.telegramId }}
        </span>
        <span v-if="client.address" class="flex items-center gap-1.5 text-muted">
          <UIcon name="i-lucide-map-pin" class="size-4 text-dimmed" />
          {{ client.address }}
        </span>
        <UBadge v-if="client.isArchived" :label="$t('common.archived')" color="neutral" variant="subtle" size="sm" />
        <UBadge v-for="tag in client.tags" :key="tag" :label="tag" variant="subtle" color="primary" size="sm" />
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6 space-y-6">
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4" data-tour="client-stats">
        <SharedStatCard
          :label="$t('clients.totalOrders')"
          :value="client.totalOrders"
          icon="i-lucide-clipboard-list"
          color="primary"
        />
        <SharedStatCard
          :label="$t('clients.lifetimeSpend')"
          :value="formatMoney(client.totalSpent, false)"
          icon="i-lucide-banknote"
          color="success"
        />
        <SharedStatCard
          :label="$t('clients.outstanding')"
          :value="formatMoney(client.debtBalance, false)"
          icon="i-lucide-hand-coins"
          :color="client.debtBalance > 0 ? 'warning' : 'neutral'"
        />
        <SharedStatCard
          :label="$t('clients.lastOrder')"
          :value="formatDate(client.lastOrderAt)"
          icon="i-lucide-calendar-clock"
          color="neutral"
        />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <!-- Measurements -->
        <UCard class="lg:col-span-2" data-tour="client-measurements">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-highlighted">
                  {{ $t('measurements.profiles') }}
                </h2>
                <p class="text-xs text-muted mt-0.5">
                  {{ $t('measurements.profilesHint') }}
                </p>
              </div>

              <div class="flex items-center gap-2">
                <USwitch v-model="showHistory" :label="$t('common.history')" size="sm" />
                <UButton
                  v-if="$can('clients:measurements')"
                  icon="i-lucide-plus"
                  size="xs"
                  variant="subtle"
                  @click="() => { measureOpen = true }"
                >
                  {{ $t('common.add') }}
                </UButton>
              </div>
            </div>
          </template>

          <div v-if="loadingProfiles" class="space-y-2">
            <USkeleton v-for="n in 2" :key="n" class="h-16 w-full" />
          </div>

          <SharedEmptyState
            v-else-if="!groupedProfiles.length"
            icon="i-lucide-ruler"
            :title="$t('measurements.none')"
            :description="$t('measurements.noneHint')"
            compact
          >
            <UButton v-if="$can('clients:measurements')" icon="i-lucide-ruler" size="sm" @click="() => { measureOpen = true }">
              {{ $t('clients.takeMeasurements') }}
            </UButton>
          </SharedEmptyState>

          <UAccordion
            v-else
            :items="groupedProfiles.map(group => ({
              label: group.name,
              icon: 'i-lucide-ruler',
              value: group.name,
              slot: 'profile' as const,
              group
            }))"
          >
            <template #profile="{ item }">
              <div class="space-y-4 pb-2">
                <div
                  v-for="revision in (item as never as { group: { revisions: MeasurementProfile[] } }).group.revisions"
                  :key="revision._id"
                  class="rounded-md ring ring-default p-3"
                  :class="revision.isActive ? '' : 'opacity-60'"
                >
                  <div class="flex flex-wrap items-center gap-2 mb-3">
                    <UBadge
                      :label="`v${revision.version}`"
                      size="sm"
                      :color="revision.isActive ? 'primary' : 'neutral'"
                      variant="subtle"
                    />
                    <UBadge v-if="revision.isActive" :label="$t('measurements.current')" size="sm" color="success" variant="subtle" />
                    <span v-if="revision.garmentCategoryName" class="text-xs text-muted">
                      {{ revision.garmentCategoryName }}
                    </span>
                    <span class="text-xs text-dimmed ml-auto">
                      {{ formatDateTime(revision.takenAt) }}
                    </span>
                  </div>

                  <dl class="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                    <div v-for="value in revision.values" :key="value.key" class="min-w-0">
                      <dt class="text-[11px] text-muted truncate">
                        {{ value.label }}
                      </dt>
                      <dd class="text-sm font-medium text-highlighted tabular-nums">
                        {{ value.value }}<span class="text-xs text-dimmed ml-0.5">{{ value.unit }}</span>
                      </dd>
                    </div>
                  </dl>

                  <p v-if="revision.notes" class="text-xs text-muted mt-3 pt-3 border-t border-default">
                    {{ revision.notes }}
                  </p>
                </div>
              </div>
            </template>
          </UAccordion>
        </UCard>

        <!-- Orders + notes -->
        <div class="space-y-4">
          <UCard v-if="client.notes">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('common.notes') }}
              </h2>
            </template>
            <p class="text-sm text-toned whitespace-pre-line">
              {{ client.notes }}
            </p>
          </UCard>

          <UCard data-tour="client-orders">
            <template #header>
              <h2 class="text-sm font-semibold text-highlighted">
                {{ $t('clients.orderHistory') }}
              </h2>
            </template>

            <SharedEmptyState
              v-if="!data?.orders?.length"
              icon="i-lucide-clipboard-list"
              :title="$t('dashboard.noOrders')"
              compact
            />

            <ul v-else class="divide-y divide-default -my-2">
              <li v-for="order in data.orders" :key="order._id as string">
                <NuxtLink
                  :to="`/orders/${order._id}`"
                  class="flex items-center gap-3 py-2.5 hover:bg-elevated/50 -mx-2 px-2 rounded transition-colors"
                >
                  <div class="min-w-0 flex-1">
                    <span class="font-mono text-[11px] text-muted">{{ order.orderNumber }}</span>
                    <div class="mt-0.5">
                      <SharedStatusBadge :status="order.status as string" size="sm" short />
                    </div>
                  </div>
                  <div class="text-right shrink-0">
                    <p class="text-sm tabular-nums text-highlighted">
                      {{ formatMoney(order.totalPrice as number, false) }}
                    </p>
                    <p class="text-[11px] text-dimmed">
                      {{ formatDate(order.orderDate as string) }}
                    </p>
                  </div>
                </NuxtLink>
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </div>

    <ClientsClientFormModal v-model:open="editOpen" :client="client" @saved="refresh()" />
    <ClientsMeasurementModal
      v-model:open="measureOpen"
      :client-id="client._id"
      :client-name="client.fullName"
      @saved="onMeasurementSaved"
    />
  </div>
</template>
