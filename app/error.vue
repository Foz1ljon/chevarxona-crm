<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()

const isForbidden = computed(() => props.error.statusCode === 403)
const isNotFound = computed(() => props.error.statusCode === 404)

const meta = computed(() => {
  if (isForbidden.value) {
    return {
      icon: 'i-lucide-shield-x',
      title: t('error.accessDenied'),
      description: t('error.accessDeniedBody')
    }
  }
  if (isNotFound.value) {
    return {
      icon: 'i-lucide-map-pin-off',
      title: t('error.notFound'),
      description: t('error.notFoundBody')
    }
  }
  return {
    icon: 'i-lucide-triangle-alert',
    title: t('error.generic'),
    description: props.error.message || t('error.genericBody')
  }
})
</script>

<template>
  <UApp>
    <div class="min-h-screen flex items-center justify-center p-6 bg-muted">
      <UCard class="max-w-md w-full">
        <div class="flex flex-col items-center text-center gap-4 py-4">
          <div class="size-14 rounded-full bg-elevated flex items-center justify-center">
            <UIcon :name="meta.icon" class="size-7 text-primary" />
          </div>

          <div class="space-y-1">
            <p class="text-xs font-mono text-muted">
              {{ $t('error.errorCode', { code: error.statusCode }) }}
            </p>
            <h1 class="text-xl font-semibold text-highlighted">
              {{ meta.title }}
            </h1>
            <p class="text-sm text-muted">
              {{ meta.description }}
            </p>
          </div>

          <div class="flex gap-2 pt-2">
            <UButton icon="i-lucide-arrow-left" variant="subtle" @click="$router.back()">
              {{ $t('common.back') }}
            </UButton>
            <UButton icon="i-lucide-home" @click="clearError({ redirect: '/' })">
              {{ $t('nav.dashboard') }}
            </UButton>
          </div>
        </div>
      </UCard>
    </div>
  </UApp>
</template>
