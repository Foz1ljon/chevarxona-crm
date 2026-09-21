<script setup lang="ts">
import { ROLE_KEYS, type RoleKey } from '#shared/utils/permissions'
import type { TableColumn } from '@nuxt/ui'
import type { StaffUser } from '~/composables/useStaff'

definePageMeta({ permission: ['users:read', 'users:manage'] })
const { t } = useI18n()
useHead({ title: () => t('nav.staff') })

const auth = useAuthStore()
const { users, roles, deactivateUser } = useStaff()
const { formatDateTime, initials } = useFormat()
const { role: roleMeta } = useLabels()
const toast = useApiToast()

const filters = reactive({
  search: '',
  role: undefined as RoleKey | undefined,
  active: 'all' as 'true' | 'false' | 'all',
  page: 1
})

const debounced = useDebounced(toRef(filters, 'search'), 300)

const query = computed(() => ({
  page: filters.page,
  limit: 25,
  search: debounced.value || undefined,
  role: filters.role,
  active: filters.active,
  sort: 'fullName',
  dir: 'asc' as const
}))

const { data, pending, refresh } = await users(query)
const { data: roleData } = await roles()

watch([debounced, () => filters.role, () => filters.active], () => { filters.page = 1 })

const formOpen = ref(false)
const editing = ref<StaffUser | null>(null)
const deactivating = ref<StaffUser | null>(null)
const deactivatePending = ref(false)

function openCreate() {
  editing.value = null
  formOpen.value = true
}

function openEdit(user: StaffUser) {
  editing.value = user
  formOpen.value = true
}

async function confirmDeactivate() {
  if (!deactivating.value) return
  deactivatePending.value = true
  try {
    await deactivateUser(deactivating.value._id)
    deactivating.value = null
    await refresh()
  } catch (error) {
    toast.error(error, t('staff.deactivateFailed'))
  } finally {
    deactivatePending.value = false
  }
}

const columns = computed<TableColumn<StaffUser>[]>(() => [
  { accessorKey: 'fullName', header: t('staff.person') },
  { accessorKey: 'roleKey', header: t('staff.role') },
  { accessorKey: 'phone', header: t('clients.contact') },
  { accessorKey: 'lastLoginAt', header: t('staff.lastSignIn') },
  { accessorKey: 'isActive', header: t('common.status') },
  { id: 'actions', header: '', meta: { class: { th: 'w-10', td: 'w-10' } } }
])
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.staff')"
      :description="$t('staff.accounts', { n: data?.total ?? 0 })"
      icon="i-lucide-user-cog"
    >
      <template #actions>
        <UButton v-if="$can('roles:manage')" to="/settings/roles" icon="i-lucide-shield-check" color="neutral" variant="subtle">
          {{ $t('staff.rolesBtn') }}
        </UButton>
        <UButton v-if="$can('users:manage')" icon="i-lucide-user-plus" data-tour="staff-add" @click="openCreate">
          {{ $t('staff.addStaff') }}
        </UButton>
      </template>

      <div class="flex flex-wrap items-center gap-2" data-tour="staff-filters">
        <UInput v-model="filters.search" icon="i-lucide-search" :placeholder="$t('staff.searchPlaceholder')" class="w-full sm:w-72" />

        <USelect
          v-model="filters.role"
          :items="[
            { label: $t('staff.allRoles'), value: undefined },
            ...ROLE_KEYS.map(key => ({ label: roleMeta(key).label, value: key }))
          ]"
          class="w-44"
        />

        <USelect
          v-model="filters.active"
          :items="[
            { label: $t('common.all'), value: 'all' },
            { label: $t('common.active'), value: 'true' },
            { label: $t('staff.deactivated'), value: 'false' }
          ]"
          class="w-36"
        />
      </div>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <UCard :ui="{ body: 'p-0 sm:p-0' }" data-tour="staff-table">
        <UTable
          :data="data?.items ?? []"
          :columns="columns"
          :loading="pending"
          sticky="header"
          :empty="$t('staff.noneMatch')"
          :ui="{ tr: 'hover:bg-elevated/50' }"
        >
          <template #fullName-cell="{ row }">
            <div class="flex items-center gap-3">
              <span
                class="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0"
                :class="row.original.isActive ? '' : 'opacity-50 grayscale'"
              >
                {{ initials(row.original.fullName) }}
              </span>
              <div class="min-w-0">
                <p class="font-medium text-highlighted truncate">
                  {{ row.original.fullName }}
                  <UBadge
                    v-if="row.original._id === auth.user?.id"
                    :label="$t('common.youSuffix')"
                    size="sm"
                    variant="subtle"
                    color="primary"
                    class="ml-1"
                  />
                </p>
                <p class="text-[11px] text-dimmed truncate">
                  {{ row.original.email }}
                </p>
              </div>
            </div>
          </template>

          <template #roleKey-cell="{ row }">
            <UBadge
              :label="roleMeta(row.original.roleKey).label"
              :icon="roleMeta(row.original.roleKey).icon"
              :color="roleMeta(row.original.roleKey).color as never"
              variant="subtle"
              size="sm"
            />
            <p
              v-if="row.original.extraPermissions?.length"
              class="text-[11px] text-info mt-0.5"
            >
              {{ $t('staff.extraPerms', { n: row.original.extraPermissions.length }) }}
            </p>
          </template>

          <template #phone-cell="{ row }">
            <span class="text-sm text-muted">{{ row.original.phone || '—' }}</span>
            <p v-if="row.original.specialties?.length" class="text-[11px] text-dimmed truncate max-w-[12rem]">
              {{ row.original.specialties.join(', ') }}
            </p>
          </template>

          <template #lastLoginAt-cell="{ row }">
            <span class="text-sm text-muted">
              {{ row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : $t('common.never') }}
            </span>
          </template>

          <template #isActive-cell="{ row }">
            <UBadge
              :label="row.original.isActive ? $t('common.active') : $t('staff.deactivated')"
              :color="row.original.isActive ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </template>

          <template #actions-cell="{ row }">
            <UDropdownMenu
              :items="[[
                ...(auth.can('users:manage')
                  ? [{ label: $t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(row.original) }]
                  : []),
                ...(auth.can('users:manage') && row.original.isActive && row.original._id !== auth.user?.id
                  ? [{ label: $t('inventory.deactivate'), icon: 'i-lucide-user-x', color: 'error' as const, onSelect: () => (deactivating = row.original) }]
                  : [])
              ]]"
            >
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" size="xs" square />
            </UDropdownMenu>
          </template>
        </UTable>
      </UCard>

      <div v-if="(data?.pages ?? 1) > 1" class="flex justify-center mt-4">
        <UPagination v-model:page="filters.page" :total="data?.total ?? 0" :items-per-page="25" />
      </div>
    </div>

    <UsersStaffFormModal
      v-model:open="formOpen"
      :user="editing"
      :roles="roleData?.items ?? []"
      :groups="roleData?.groups ?? {}"
      @saved="refresh()"
    />

    <SharedConfirmModal
      :open="Boolean(deactivating)"
      :title="$t('staff.deactivateTitle')"
      :description="$t('staff.deactivateBody', { name: deactivating?.fullName ?? '' })"
      :confirm-label="$t('inventory.deactivate')"
      :loading="deactivatePending"
      @update:open="value => !value && (deactivating = null)"
      @confirm="confirmDeactivate"
    />
  </div>
</template>
