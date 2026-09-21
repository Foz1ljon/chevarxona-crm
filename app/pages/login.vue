<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth', public: true })

const auth = useAuthStore()
const route = useRoute()
const toast = useApiToast()
const { t } = useI18n()

useHead({ title: () => t('auth.signIn') })

const schema = computed(() => z.object({
  email: z.string().min(1, t('validation.emailRequired')).email(t('validation.emailInvalid')),
  password: z.string().min(1, t('validation.passwordRequired'))
}))

type Schema = { email: string, password: string }

const state = reactive({ email: '', password: '' })
const pending = ref(false)
const formError = ref('')

/** Demo credentials shortcut — development builds only. */
const isDev = import.meta.dev
const DEMO_ACCOUNTS = [
  { email: 'admin@chevarxona.uz', password: 'admin123', labelKey: 'auth.demoAdmin' },
  { email: 'nodira@chevarxona.uz', password: 'demo1234', labelKey: 'auth.demoManager' }
]

function useDemoAccount(account: { email: string, password: string }) {
  state.email = account.email
  state.password = account.password
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  pending.value = true
  formError.value = ''

  try {
    const user = await auth.login(event.data)
    const redirect = (route.query.redirect as string | undefined) ?? landingFor(user.roleKey)
    toast.success(t('auth.welcomeBack', { name: user.fullName.split(' ')[0] ?? '' }))
    await navigateTo(redirect)
  } catch (error) {
    formError.value = toast.describe(error)
  } finally {
    pending.value = false
  }
}

function landingFor(roleKey: string) {
  if (roleKey === 'TAILOR') return '/orders'
  if (roleKey === 'INVENTORY_CLERK') return '/inventory'
  return '/'
}
</script>

<template>
  <div class="space-y-6">
    <div class="lg:hidden flex items-center gap-2.5 mb-8">
      <div class="size-10 rounded-lg bg-primary flex items-center justify-center">
        <UIcon name="i-lucide-scissors" class="size-5 text-inverted" />
      </div>
      <span class="font-semibold text-lg tracking-tight text-highlighted">{{ $t('app.name') }}</span>
    </div>

    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold text-highlighted tracking-tight">
        {{ $t('auth.signIn') }}
      </h1>
      <p class="text-sm text-muted">
        {{ $t('auth.subtitle') }}
      </p>
    </div>

    <UAlert
      v-if="formError"
      :description="formError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
    />

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField :label="$t('common.email')" name="email" required>
        <UInput
          v-model="state.email"
          type="email"
          placeholder="you@chevarxona.uz"
          icon="i-lucide-mail"
          size="lg"
          class="w-full"
          autocomplete="username"
          autofocus
        />
      </UFormField>

      <UFormField :label="$t('auth.password')" name="password" required>
        <UInput
          v-model="state.password"
          type="password"
          placeholder="••••••••"
          icon="i-lucide-lock"
          size="lg"
          class="w-full"
          autocomplete="current-password"
        />
      </UFormField>

      <UButton
        type="submit"
        size="lg"
        block
        :loading="pending"
        trailing-icon="i-lucide-arrow-right"
      >
        {{ $t('auth.signIn') }}
      </UButton>
    </UForm>

    <div v-if="isDev" class="rounded-xl ring ring-default bg-elevated/40 p-3 space-y-2">
      <p class="text-xs font-medium text-highlighted">
        {{ $t('auth.demoTitle') }}
      </p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="account in DEMO_ACCOUNTS"
          :key="account.email"
          size="xs"
          color="neutral"
          variant="subtle"
          icon="i-lucide-wand-2"
          @click="useDemoAccount(account)"
        >
          {{ $t(account.labelKey) }}
        </UButton>
      </div>
      <p class="text-[11px] text-dimmed">{{ $t('auth.demoBody') }}</p>
    </div>

    <p class="text-xs text-dimmed text-center pt-2">
      {{ $t('auth.lostAccess') }}
    </p>
  </div>
</template>
