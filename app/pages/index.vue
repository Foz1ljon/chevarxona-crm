<script setup lang="ts">
definePageMeta({ permission: 'dashboard:read' })
const { t } = useI18n()
useHead({ title: () => t('nav.dashboard') })

const auth = useAuthStore()
const { formatMoney, formatMoneyCompact, formatDate, formatRelative, daysUntil } = useFormat()

const { data, pending, refresh } = await useFetch('/api/dashboard/stats')
const { data: agenda } = await useFetch('/api/dashboard/agenda', { query: { days: 14 } })

const kpis = computed(() => data.value?.kpis)

const firstName = computed(() => auth.user?.fullName.split(' ')[0] ?? '')

const greeting = computed(() => {
  const hour = new Date().getHours()
  const key = hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening'
  return t(`dashboard.greeting${key}`, { name: firstName.value })
})

const deadlineTone = (deadline?: string | null) => {
  const days = daysUntil(deadline)
  if (days === null) return 'text-muted'
  if (days < 0) return 'text-error font-medium'
  if (days <= 2) return 'text-warning font-medium'
  return 'text-muted'
}
</script>

<template>
  <div>
    <SharedPageHeader
      :title="greeting"
      :description="$t('dashboard.subtitle')"
      icon="i-lucide-layout-dashboard"
    >
      <template #actions>
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="subtle"
          :loading="pending"
          @click="refresh()"
        >
          {{ $t('common.refresh') }}
        </UButton>
        <UButton v-if="$can('orders:create')" to="/orders/new" icon="i-lucide-plus">
          {{ $t('header.newOrder') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6 space-y-6">
      <!-- KPI row -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-tour="dashboard-kpis">
        <SharedStatCard
          :label="$t('dashboard.activeOrders')"
          :value="kpis?.activeOrders ?? 0"
          icon="i-lucide-clipboard-list"
          color="primary"
          to="/orders"
          :loading="pending"
          :hint="kpis?.overdueOrders
            ? $t('dashboard.pastDeadline', { n: kpis.overdueOrders })
            : $t('dashboard.allOnSchedule')"
        />
        <SharedStatCard
          :label="$t('dashboard.fittingsWeek')"
          :value="kpis?.fittingsThisWeek ?? 0"
          icon="i-lucide-ruler"
          color="info"
          :loading="pending"
          :hint="$t('dashboard.todayCount', { n: kpis?.fittingsToday ?? 0 })
            + (kpis?.overdueFittings ? ` · ${$t('dashboard.overdueFittings', { n: kpis.overdueFittings })}` : '')"
        />
        <SharedStatCard
          v-if="$can('inventory:read')"
          :label="$t('dashboard.lowStock')"
          :value="kpis?.lowStockCount ?? 0"
          icon="i-lucide-package-x"
          :color="kpis?.outOfStockCount ? 'error' : kpis?.lowStockCount ? 'warning' : 'success'"
          to="/inventory?stock=low"
          :loading="pending"
          :hint="kpis?.outOfStockCount
            ? $t('dashboard.fullyOut', { n: kpis.outOfStockCount })
            : $t('dashboard.aboveReorder')"
        />
        <SharedStatCard
          :label="$t('dashboard.collected')"
          :value="formatMoneyCompact(kpis?.monthRevenue)"
          icon="i-lucide-banknote"
          color="success"
          :loading="pending"
          :hint="$t('dashboard.paymentsReceived', { n: kpis?.monthPayments ?? 0 })"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SharedStatCard
          :label="$t('dashboard.outstandingDebt')"
          :value="formatMoneyCompact(kpis?.outstandingDebt)"
          icon="i-lucide-hand-coins"
          :color="kpis?.outstandingDebt ? 'warning' : 'neutral'"
          to="/orders/list?unpaid=true"
          :loading="pending"
          :hint="$t('dashboard.acrossOpen', { n: kpis?.unpaidOrders ?? 0 })"
        />
        <SharedStatCard
          :label="$t('dashboard.booked')"
          :value="formatMoneyCompact(kpis?.monthBooked)"
          icon="i-lucide-receipt-text"
          color="info"
          :loading="pending"
          :hint="$t('dashboard.newOrders', { n: kpis?.monthOrders ?? 0 })"
        />
        <SharedStatCard
          v-if="$can('inventory:read')"
          :label="$t('dashboard.stockValue')"
          :value="formatMoneyCompact(kpis?.stockValue)"
          icon="i-lucide-boxes"
          color="neutral"
          to="/inventory"
          :loading="pending"
          :hint="$t('dashboard.stockValueHint')"
        />
        <SharedStatCard
          v-if="$can('clients:read')"
          :label="$t('dashboard.clients')"
          :value="kpis?.totalClients ?? 0"
          icon="i-lucide-users"
          color="neutral"
          to="/clients"
          :loading="pending"
          :hint="kpis?.clientsInDebt
            ? $t('dashboard.withBalance', { n: kpis.clientsInDebt })
            : $t('dashboard.noBalances')"
        />
      </div>

      <!-- Pipeline + revenue -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" data-tour="dashboard-pipeline">
        <DashboardPipelineBar :pipeline="data?.pipeline ?? []" />
        <DashboardRevenueChart v-if="$can('reports:read')" :trend="data?.revenueTrend ?? []" />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Agenda -->
        <UCard class="lg:col-span-2" data-tour="dashboard-agenda">
          <template #header>
            <div class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-highlighted">
                  {{ $t('dashboard.nextTwoWeeks') }}
                </h2>
                <p class="text-xs text-muted mt-0.5">
                  {{ $t('dashboard.fittingsDeadlines') }}
                </p>
              </div>
              <UButton to="/orders/list" size="xs" variant="ghost" color="neutral" trailing-icon="i-lucide-arrow-right">
                {{ $t('dashboard.allOrdersLink') }}
              </UButton>
            </div>
          </template>

          <SharedEmptyState
            v-if="!agenda?.entries?.length"
            icon="i-lucide-calendar-check"
            :title="$t('dashboard.nothingScheduled')"
            :description="$t('dashboard.nothingScheduledHint')"
            compact
          />

          <ul v-else class="divide-y divide-default -my-2">
            <li v-for="entry in agenda.entries.slice(0, 8)" :key="`${entry.type}-${entry.order._id}`">
              <NuxtLink
                :to="`/orders/${entry.order._id}`"
                class="flex items-center gap-3 py-2.5 hover:bg-elevated/50 -mx-2 px-2 rounded transition-colors"
              >
                <div
                  class="size-9 rounded-lg flex items-center justify-center shrink-0"
                  :class="entry.type === 'FITTING' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'"
                >
                  <UIcon :name="entry.type === 'FITTING' ? 'i-lucide-ruler' : 'i-lucide-alarm-clock'" class="size-4" />
                </div>

                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-highlighted truncate">
                    {{ entry.order.clientName }}
                  </p>
                  <p class="text-xs text-muted truncate">
                    {{ entry.order.orderNumber }} · {{ entry.type === 'FITTING' ? $t('dashboard.fitting') : $t('dashboard.deadline') }}
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <p class="text-xs" :class="deadlineTone(entry.date)">
                    {{ formatRelative(entry.date) }}
                  </p>
                  <p class="text-[11px] text-dimmed">
                    {{ formatDate(entry.date) }}
                  </p>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </UCard>

        <!-- Tailor workload -->
        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ $t('dashboard.tailorWorkload') }}
            </h2>
            <p class="text-xs text-muted mt-0.5">
              {{ $t('dashboard.openGarments') }}
            </p>
          </template>

          <SharedEmptyState
            v-if="!data?.tailorWorkload?.length"
            icon="i-lucide-user-round-x"
            :title="$t('dashboard.nothingAssigned')"
            :description="$t('dashboard.nothingAssignedHint')"
            compact
          />

          <ul v-else class="space-y-3">
            <li v-for="tailor in data.tailorWorkload" :key="tailor.id" class="space-y-1.5">
              <div class="flex items-center justify-between gap-2 text-sm">
                <span class="truncate text-toned">{{ tailor.name }}</span>
                <span class="tabular-nums text-xs text-muted shrink-0">
                  {{ $t('dashboard.garmentsOrders', { g: tailor.garments, o: tailor.orders }) }}
                </span>
              </div>
              <UProgress
                :model-value="tailor.garments"
                :max="Math.max(...data.tailorWorkload.map(t => t.garments), 1)"
                size="sm"
                :color="tailor.garments > 8 ? 'error' : tailor.garments > 4 ? 'warning' : 'primary'"
              />
            </li>
          </ul>
        </UCard>
      </div>

      <!-- Recent + top garments -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <UCard class="lg:col-span-2">
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ $t('dashboard.latestOrders') }}
            </h2>
          </template>

          <SharedEmptyState
            v-if="!data?.recentOrders?.length"
            icon="i-lucide-file-plus"
            :title="$t('dashboard.noOrders')"
            :description="$t('dashboard.noOrdersHint')"
            compact
          >
            <UButton v-if="$can('orders:create')" to="/orders/new" icon="i-lucide-plus" size="sm">
              {{ $t('header.newOrder') }}
            </UButton>
          </SharedEmptyState>

          <ul v-else class="divide-y divide-default -my-2">
            <li v-for="order in data.recentOrders" :key="order._id">
              <NuxtLink
                :to="`/orders/${order._id}`"
                class="flex items-center gap-3 py-2.5 hover:bg-elevated/50 -mx-2 px-2 rounded transition-colors"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs text-muted">{{ order.orderNumber }}</span>
                    <SharedStatusBadge :status="order.status" size="sm" short />
                  </div>
                  <p class="text-sm text-highlighted truncate mt-0.5">
                    {{ order.clientName }}
                  </p>
                </div>

                <div class="text-right shrink-0">
                  <p class="text-sm font-medium text-highlighted tabular-nums">
                    {{ formatMoney(order.totalPrice, false) }}
                  </p>
                  <p v-if="order.balanceDue > 0" class="text-[11px] text-warning tabular-nums">
                    {{ $t('dashboard.due', { amount: formatMoney(order.balanceDue, false) }) }}
                  </p>
                  <p v-else class="text-[11px] text-success">
                    {{ $t('dashboard.paid') }}
                  </p>
                </div>
              </NuxtLink>
            </li>
          </ul>
        </UCard>

        <UCard>
          <template #header>
            <h2 class="text-sm font-semibold text-highlighted">
              {{ $t('dashboard.mostOrdered') }}
            </h2>
            <p class="text-xs text-muted mt-0.5">
              {{ $t('dashboard.last6Months') }}
            </p>
          </template>

          <SharedEmptyState
            v-if="!data?.topGarments?.length"
            icon="i-lucide-shirt"
            :title="$t('dashboard.noData')"
            compact
          />

          <ul v-else class="space-y-2.5">
            <li
              v-for="(garment, index) in data.topGarments"
              :key="garment.name"
              class="flex items-center gap-3"
            >
              <span class="text-xs font-mono text-dimmed w-4 shrink-0">{{ index + 1 }}</span>
              <span class="flex-1 min-w-0 truncate text-sm text-toned">{{ garment.name }}</span>
              <UBadge :label="String(garment.count)" variant="subtle" color="neutral" size="sm" />
            </li>
          </ul>
        </UCard>
      </div>
    </div>
  </div>
</template>
