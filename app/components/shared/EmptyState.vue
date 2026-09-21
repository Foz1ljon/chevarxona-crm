<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
  compact?: boolean
}>(), { icon: 'i-lucide-inbox', compact: false })
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'py-8 px-4' : 'py-16 px-6'">
    <div
      class="rounded-2xl flex items-center justify-center mb-3 bg-elevated ring-1 ring-default"
      :class="compact ? 'size-11' : 'size-16'"
    >
      <UIcon :name="icon" class="text-dimmed" :class="compact ? 'size-5' : 'size-7'" />
    </div>

    <p class="font-medium text-highlighted" :class="compact ? 'text-sm' : 'text-base'">
      {{ title }}
    </p>
    <p v-if="description" class="text-sm text-muted mt-1 max-w-sm">
      {{ description }}
    </p>

    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
