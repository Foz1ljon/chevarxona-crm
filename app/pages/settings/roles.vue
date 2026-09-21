<script setup lang="ts">
import type { Permission } from '#shared/utils/permissions'
import type { StaffRole } from '~/composables/useStaff'

definePageMeta({ permission: 'roles:manage' })
const { t } = useI18n()
useHead({ title: () => t('nav.rolesPermissions') })

const { roles, updateRole } = useStaff()
const { role: roleMeta } = useLabels()
const toast = useApiToast()

const { data, refresh } = await roles()

const activeKey = ref<string | null>(null)
const draft = ref<Permission[]>([])
const saving = ref(false)

const activeRole = computed<StaffRole | null>(() =>
  data.value?.items.find(role => role._id === activeKey.value) ?? null
)

// Select the first editable role on load.
watchEffect(() => {
  if (!activeKey.value && data.value?.items.length) {
    activeKey.value = (data.value.items.find(role => role.key !== 'SUPER_ADMIN') ?? data.value.items[0])!._id
  }
})

watch(activeRole, (role) => {
  draft.value = [...(role?.permissions ?? [])]
}, { immediate: true })

const isSuperAdmin = computed(() => activeRole.value?.key === 'SUPER_ADMIN')

const dirty = computed(() => {
  if (!activeRole.value) return false
  const current = new Set(activeRole.value.permissions)
  return draft.value.length !== current.size || draft.value.some(p => !current.has(p))
})

async function save() {
  if (!activeRole.value) return
  saving.value = true
  try {
    await updateRole(activeRole.value._id, { permissions: draft.value })
    await refresh()
  } catch (error) {
    toast.error(error, t('roles.saveFailed'))
  } finally {
    saving.value = false
  }
}

function reset() {
  draft.value = [...(activeRole.value?.permissions ?? [])]
}
</script>

<template>
  <div>
    <SharedPageHeader
      :title="$t('nav.rolesPermissions')"
      :description="$t('roles.subtitle')"
      icon="i-lucide-shield-check"
    >
      <template #actions>
        <UButton
          v-if="dirty"
          color="neutral"
          variant="ghost"
          :disabled="saving"
          @click="reset"
        >
          {{ $t('common.discard') }}
        </UButton>
        <UButton
          icon="i-lucide-save"
          :loading="saving"
          data-tour="roles-save"
          :disabled="!dirty || isSuperAdmin"
          @click="save"
        >
          {{ $t('roles.savePermissions') }}
        </UButton>
      </template>
    </SharedPageHeader>

    <div class="p-4 sm:p-6">
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        <!-- Role list -->
        <div class="lg:col-span-1 space-y-2" data-tour="roles-list">
          <button
            v-for="role in data?.items ?? []"
            :key="role._id"
            type="button"
            class="w-full text-left rounded-lg ring p-3 transition-colors"
            :class="activeKey === role._id
              ? 'ring-primary bg-primary/5'
              : 'ring-default bg-default hover:bg-elevated/50'"
            @click="activeKey = role._id"
          >
            <div class="flex items-start gap-2.5">
              <UIcon :name="roleMeta(role.key).icon" class="size-4 mt-0.5 shrink-0 text-primary" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-highlighted truncate">
                  {{ roleMeta(role.key).label }}
                </p>
                <p class="text-[11px] text-muted mt-0.5 line-clamp-2">
                  {{ roleMeta(role.key).description }}
                </p>
                <div class="flex items-center gap-1.5 mt-1.5">
                  <UBadge
                    :label="$t('roles.activeCount', { n: role.activeUserCount })"
                    size="sm"
                    variant="subtle"
                    color="neutral"
                  />
                  <UBadge
                    :label="role.key === 'SUPER_ADMIN'
                      ? $t('roles.permsAll')
                      : $t('roles.permsCount', { n: role.permissions.length })"
                    size="sm"
                    variant="subtle"
                    color="primary"
                  />
                </div>
              </div>
            </div>
          </button>
        </div>

        <!-- Matrix -->
        <div class="lg:col-span-3">
          <UAlert
            v-if="isSuperAdmin"
            icon="i-lucide-shield-check"
            color="info"
            variant="subtle"
            class="mb-4"
            :title="$t('roles.superAdminTitle')"
            :description="$t('roles.superAdminBody')"
          />

          <UAlert
            v-else-if="dirty"
            icon="i-lucide-circle-alert"
            color="warning"
            variant="subtle"
            class="mb-4"
            :title="$t('roles.unsavedTitle')"
            :description="$t('roles.unsavedBody', { n: draft.length, u: activeRole?.userCount ?? 0 })"
          />

          <UsersPermissionMatrix
            v-if="activeRole"
            data-tour="roles-matrix"
            v-model="draft"
            :groups="data?.groups ?? {}"
            :disabled="isSuperAdmin"
          />
        </div>
      </div>
    </div>
  </div>
</template>
