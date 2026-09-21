<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  title: string
  description?: string
  icon?: string
  backTo?: string
}>()
</script>

<template>
  <!-- Kept in view on tall tables so the filters never scroll away. -->
  <div class="border-b border-default bg-default page-glow sm:sticky sm:top-16 z-20 sm:backdrop-blur-md sm:bg-default/85">
    <div class="px-4 sm:px-6 py-4 sm:py-5">
      <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div class="flex items-start gap-3 min-w-0 flex-1">
          <UButton
            v-if="backTo"
            :to="backTo"
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            square
            size="sm"
            class="mt-0.5 shrink-0"
            :aria-label="t('common.back')"
          />

          <div
            v-else-if="icon"
            class="size-10 rounded-xl bg-primary/10 ring-1 ring-primary/15 flex items-center justify-center shrink-0"
          >
            <UIcon :name="icon" class="size-5 text-primary" />
          </div>

          <div class="min-w-0">
            <h1 class="text-lg sm:text-xl font-semibold text-highlighted tracking-tight truncate">
              {{ title }}
            </h1>
            <p v-if="description" class="text-sm text-muted mt-0.5">
              {{ description }}
            </p>
          </div>
        </div>

        <div v-if="$slots.actions" class="flex items-center gap-2 shrink-0 flex-wrap">
          <slot name="actions" />
        </div>
      </div>

      <div v-if="$slots.default" class="mt-4">
        <slot />
      </div>
    </div>
  </div>
</template>
