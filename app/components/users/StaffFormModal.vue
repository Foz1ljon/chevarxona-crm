<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { ROLE_KEYS, type Permission } from '#shared/utils/permissions'
import type { StaffUser, StaffRole } from '~/composables/useStaff'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  user?: StaffUser | null
  roles: StaffRole[]
  groups: Record<string, { label: string, permissions: Record<string, string> }>
}>()

const emit = defineEmits<{ saved: [] }>()

const { createUser, updateUser } = useStaff()
const { role: roleMeta } = useLabels()
const toast = useApiToast()
const { t } = useI18n()

const isEdit = computed(() => Boolean(props.user?._id))
const pending = ref(false)
const tab = ref<'details' | 'permissions'>('details')

const baseSchema = () => ({
  fullName: z.string().trim().min(2, t('validation.nameMin')),
  email: z.string().trim().toLowerCase().email(t('validation.emailInvalid')),
  phone: z.string().trim().default(''),
  roleKey: z.enum(ROLE_KEYS),
  specialties: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
})

const schema = computed(() => {
  const base = baseSchema()
  const min = z.string().min(8, t('auth.minChars', { n: 8 }))
  return isEdit.value
    ? z.object({ ...base, password: min.optional().or(z.literal('')) })
    : z.object({ ...base, password: min })
})

const state = reactive({
  fullName: '', email: '', phone: '', password: '',
  roleKey: 'TAILOR' as (typeof ROLE_KEYS)[number],
  specialties: [] as string[],
  isActive: true
})

const extraPermissions = ref<Permission[]>([])
const revokedPermissions = ref<Permission[]>([])
const form = useTemplateRef('form')

watch(open, (isOpen) => {
  if (!isOpen) return
  tab.value = 'details'
  Object.assign(state, {
    fullName: props.user?.fullName ?? '',
    email: props.user?.email ?? '',
    phone: props.user?.phone ?? '',
    password: '',
    roleKey: props.user?.roleKey ?? 'TAILOR',
    specialties: [...(props.user?.specialties ?? [])],
    isActive: props.user?.isActive ?? true
  })
  extraPermissions.value = [...(props.user?.extraPermissions ?? [])]
  revokedPermissions.value = [...(props.user?.revokedPermissions ?? [])]
})

/** Permissions the selected role already grants — shown locked in the matrix. */
const rolePermissions = computed<Permission[]>(() => {
  const role = props.roles.find(entry => entry.key === state.roleKey)
  if (!role) return []
  return role.key === 'SUPER_ADMIN'
    ? (Object.values(props.groups).flatMap(group => Object.keys(group.permissions)) as Permission[])
    : role.permissions
})

async function onSubmit(event: FormSubmitEvent<Record<string, unknown>>) {
  pending.value = true
  try {
    const body: Record<string, unknown> = {
      ...event.data,
      extraPermissions: extraPermissions.value,
      revokedPermissions: revokedPermissions.value
    }
    // An empty password field on edit means "leave it unchanged".
    if (isEdit.value && !body.password) delete body.password

    if (isEdit.value) await updateUser(props.user!._id, body)
    else await createUser(body)

    emit('saved')
    open.value = false
  } catch (error) {
    const parsed = toast.error(error, isEdit.value ? t('staff.updateFailed') : t('staff.addFailed'))
    if (parsed.fieldErrors.length) {
      tab.value = 'details'
      form.value?.setErrors(parsed.fieldErrors)
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? $t('staff.editStaff') : $t('staff.newStaff')"
    :description="isEdit ? $t('staff.editHint') : $t('staff.newHint')"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <UForm ref="form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UTabs
          v-model="tab"
          :items="[
            { label: $t('staff.details'), value: 'details', icon: 'i-lucide-user' },
            { label: $t('staff.extraAccess'), value: 'permissions', icon: 'i-lucide-shield-plus' }
          ]"
          class="w-full"
        />

        <div v-show="tab === 'details'" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('common.fullName')" name="fullName" required class="sm:col-span-2">
            <UInput v-model="state.fullName" class="w-full" autofocus />
          </UFormField>

          <UFormField :label="$t('common.email')" name="email" required>
            <UInput v-model="state.email" type="email" icon="i-lucide-mail" class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.phone')" name="phone">
            <UInput v-model="state.phone" icon="i-lucide-phone" placeholder="+998 90 123 45 67" class="w-full" />
          </UFormField>

          <UFormField
            :label="$t('auth.password')"
            name="password"
            :required="!isEdit"
            :hint="isEdit ? $t('staff.keepPassword') : $t('auth.minChars', { n: 8 })"
          >
            <UInput v-model="state.password" type="password" class="w-full" autocomplete="new-password" />
          </UFormField>

          <UFormField :label="$t('staff.role')" name="roleKey" required>
            <USelectMenu
              v-model="state.roleKey"
              :items="ROLE_KEYS.map(key => ({ label: roleMeta(key).label, value: key, icon: roleMeta(key).icon }))"
              value-key="value"
              class="w-full"
            />
          </UFormField>

          <UFormField
            v-if="state.roleKey === 'TAILOR'"
            :label="$t('staff.specialties')"
            name="specialties"
            :hint="$t('common.pressEnter')"
            class="sm:col-span-2"
          >
            <UInputTags v-model="state.specialties" :placeholder="$t('staff.specialtiesPlaceholder')" class="w-full" />
          </UFormField>

          <div class="sm:col-span-2">
            <USwitch v-model="state.isActive" :label="$t('staff.accountActive')" />
            <p class="text-xs text-muted mt-1 ms-11">
              {{ $t('staff.accountActiveHint') }}
            </p>
          </div>

          <UAlert
            class="sm:col-span-2"
            icon="i-lucide-info"
            color="neutral"
            variant="subtle"
            :title="roleMeta(state.roleKey).label"
            :description="roleMeta(state.roleKey).description"
          />
        </div>

        <div v-show="tab === 'permissions'" class="space-y-3">
          <UAlert
            icon="i-lucide-shield-plus"
            color="info"
            variant="subtle"
            :title="$t('staff.overridesTitle')"
            :description="$t('staff.overridesBody')"
          />

          <div class="max-h-[24rem] overflow-y-auto pr-1">
            <UsersPermissionMatrix
              v-model="extraPermissions"
              :groups="groups"
              :inherited="rolePermissions"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="pending" :icon="isEdit ? 'i-lucide-save' : 'i-lucide-user-plus'">
            {{ isEdit ? $t('common.saveChanges') : $t('staff.createAccount') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
