<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen grid lg:grid-cols-2 bg-default">
    <!-- Brand panel: hidden on small screens where it would only cost scroll. -->
    <div class="hidden lg:flex relative flex-col justify-between p-10 bg-inverted text-inverted overflow-hidden">
      <div class="absolute inset-0 opacity-[0.07] weave-pattern" />

      <div class="relative flex items-center gap-3">
        <div class="size-10 rounded-lg bg-primary flex items-center justify-center">
          <UIcon name="i-lucide-scissors" class="size-5 text-inverted" />
        </div>
        <span class="font-semibold text-lg tracking-tight">{{ $t('app.name') }}</span>
      </div>

      <div class="relative space-y-6 max-w-md">
        <h1 class="text-4xl font-semibold leading-tight tracking-tight">
          {{ $t('auth.heroTitle') }}
        </h1>
        <p class="text-base opacity-70 leading-relaxed">
          {{ $t('auth.heroBody') }}
        </p>

        <ul class="space-y-3 text-sm opacity-80">
          <li v-for="feature in [
            t('auth.heroFeature1'),
            t('auth.heroFeature2'),
            t('auth.heroFeature3')
          ]" :key="feature" class="flex items-start gap-2.5">
            <UIcon name="i-lucide-check" class="size-4 mt-0.5 text-primary shrink-0" />
            <span>{{ feature }}</span>
          </li>
        </ul>
      </div>

      <p class="relative text-xs opacity-50">
        &copy; {{ new Date().getFullYear() }} {{ $t('app.name') }}
      </p>
    </div>

    <div class="flex items-center justify-center p-6 sm:p-10">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
