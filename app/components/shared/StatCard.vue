<script setup lang="ts">
// Imported explicitly: `resolveComponent('NuxtLink')` inside `<component :is>`
// does not resolve during SSR.
import { NuxtLink } from '#components'

withDefaults(defineProps<{
  label: string
  value: string | number
  icon: string
  hint?: string
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
  to?: string
  trend?: number | null
  loading?: boolean
}>(), { color: 'primary', trend: null, loading: false })

const tones: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  info: 'bg-info/10 text-info',
  neutral: 'bg-elevated text-toned'
}
</script>

<template>
  <component
    :is="to ? NuxtLink : 'div'"
    :to="to"
    class="block rounded-xl ring ring-default bg-default p-4 hover-lift"
    :class="to ? 'hover:ring-accented' : ''"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-xs font-medium text-muted uppercase tracking-wide truncate">
          {{ label }}
        </p>

        <USkeleton v-if="loading" class="h-8 w-24 mt-2" />
        <p v-else class="text-2xl font-semibold text-highlighted mt-1.5 tabular-nums truncate">
          {{ value }}
        </p>

        <div v-if="hint || trend !== null" class="flex items-center gap-1.5 mt-1">
          <span
            v-if="trend !== null"
            class="inline-flex items-center gap-0.5 text-xs font-medium"
            :class="trend >= 0 ? 'text-success' : 'text-error'"
          >
            <UIcon :name="trend >= 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'" class="size-3.5" />
            {{ Math.abs(trend) }}%
          </span>
          <p v-if="hint" class="text-xs text-muted truncate">
            {{ hint }}
          </p>
        </div>
      </div>

      <div class="size-10 rounded-xl flex items-center justify-center shrink-0" :class="tones[color]">
        <UIcon :name="icon" class="size-5" />
      </div>
    </div>
  </component>
</template>
