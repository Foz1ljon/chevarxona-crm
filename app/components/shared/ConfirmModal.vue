<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  title: string
  description?: string
  /** Defaults to the translated "Confirm". */
  confirmLabel?: string
  confirmColor?: 'error' | 'primary' | 'warning'
  icon?: string
  loading?: boolean
}>(), {
  confirmLabel: '',
  confirmColor: 'error',
  icon: 'i-lucide-triangle-alert'
})

const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description" :ui="{ content: 'max-w-md' }">
    <template #body>
      <div class="flex gap-4">
        <div
          class="size-10 rounded-full flex items-center justify-center shrink-0"
          :class="confirmColor === 'error' ? 'bg-error/10' : 'bg-warning/10'"
        >
          <UIcon
            :name="icon"
            class="size-5"
            :class="confirmColor === 'error' ? 'text-error' : 'text-warning'"
          />
        </div>

        <div class="min-w-0 flex-1 space-y-3">
          <p v-if="description" class="text-sm text-toned">
            {{ description }}
          </p>
          <slot />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton variant="ghost" color="neutral" :disabled="loading" @click="() => { open = false }">
          {{ $t('common.cancel') }}
        </UButton>
        <UButton :color="confirmColor" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel || $t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
