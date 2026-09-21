<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const open = defineModel<boolean>('open', { default: false })

const toast = useApiToast()
const { t } = useI18n()
const pending = ref(false)

const schema = computed(() => z.object({
  currentPassword: z.string().min(1, t('validation.currentPasswordRequired')),
  newPassword: z.string().min(8, t('auth.minChars', { n: 8 })),
  confirmPassword: z.string().min(1, t('validation.repeatPassword'))
}).refine(data => data.newPassword === data.confirmPassword, {
  message: t('validation.passwordsMismatch'),
  path: ['confirmPassword']
}))

type Schema = { currentPassword: string, newPassword: string, confirmPassword: string }

const state = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  pending.value = true
  try {
    await $fetch('/api/auth/change-password', { method: 'POST', body: event.data })
    toast.success(t('auth.passwordChanged'), t('auth.passwordChangedHint'))
    open.value = false
    Object.assign(state, { currentPassword: '', newPassword: '', confirmPassword: '' })
  } catch (error) {
    toast.error(error, t('auth.changePassword'))
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="$t('auth.changePassword')" :description="$t('auth.passwordHint')">
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField :label="$t('auth.currentPassword')" name="currentPassword" required>
          <UInput v-model="state.currentPassword" type="password" class="w-full" autocomplete="current-password" />
        </UFormField>

        <UFormField :label="$t('auth.newPassword')" name="newPassword" required :hint="$t('auth.minChars', { n: 8 })">
          <UInput v-model="state.newPassword" type="password" class="w-full" autocomplete="new-password" />
        </UFormField>

        <UFormField :label="$t('auth.confirmPassword')" name="confirmPassword" required>
          <UInput v-model="state.confirmPassword" type="password" class="w-full" autocomplete="new-password" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-2">
          <UButton variant="ghost" color="neutral" @click="() => { open = false }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="pending" icon="i-lucide-key-round">
            {{ $t('auth.updatePassword') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
