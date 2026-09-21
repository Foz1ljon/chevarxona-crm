<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Client } from '~/composables/useClients'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{ client?: Client | null }>()
const emit = defineEmits<{ saved: [Client] }>()

const { create, update } = useClients()
const toast = useApiToast()
const { t } = useI18n()

const isEdit = computed(() => Boolean(props.client?._id))
const pending = ref(false)

const schema = computed(() => z.object({
  fullName: z.string().trim().min(2, t('validation.nameMin')),
  phone: z.string().trim().min(6, t('validation.phoneInvalid')),
  secondaryPhone: z.string().trim().default(''),
  telegramId: z.string().trim().default(''),
  address: z.string().trim().default(''),
  notes: z.string().trim().default(''),
  tags: z.array(z.string()).default([])
}))

type Schema = {
  fullName: string, phone: string, secondaryPhone: string,
  telegramId: string, address: string, notes: string, tags: string[]
}

const state = reactive<Schema>({
  fullName: '', phone: '', secondaryPhone: '', telegramId: '', address: '', notes: '', tags: []
})

const form = useTemplateRef('form')

// Reset the fields each time the modal opens so a stale edit never leaks.
watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(state, {
    fullName: props.client?.fullName ?? '',
    phone: props.client?.phone ?? '',
    secondaryPhone: props.client?.secondaryPhone ?? '',
    telegramId: props.client?.telegramId ?? '',
    address: props.client?.address ?? '',
    notes: props.client?.notes ?? '',
    tags: [...(props.client?.tags ?? [])]
  })
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  pending.value = true
  try {
    const saved = isEdit.value
      ? await update(props.client!._id, event.data)
      : await create(event.data)

    emit('saved', saved)
    open.value = false
  } catch (error) {
    const parsed = toast.error(error, isEdit.value ? t('clients.updateFailed') : t('clients.addFailed'))
    if (parsed.fieldErrors.length) form.value?.setErrors(parsed.fieldErrors)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEdit ? $t('clients.editClient') : $t('clients.newClient')"
    :description="isEdit ? $t('clients.editSubtitle') : $t('clients.newSubtitle')"
    :ui="{ content: 'max-w-lg' }"
  >
    <template #body>
      <UForm ref="form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField :label="$t('common.fullName')" name="fullName" required class="sm:col-span-2">
            <UInput v-model="state.fullName" :placeholder="$t('clients.namePlaceholder')" class="w-full" autofocus />
          </UFormField>

          <UFormField :label="$t('common.phone')" name="phone" required>
            <UInput v-model="state.phone" placeholder="+998 90 123 45 67" icon="i-lucide-phone" class="w-full" />
          </UFormField>

          <UFormField :label="$t('clients.secondaryPhone')" name="secondaryPhone">
            <UInput v-model="state.secondaryPhone" :placeholder="$t('common.optional')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('clients.telegram')" name="telegramId">
            <UInput v-model="state.telegramId" placeholder="@username" icon="i-lucide-send" class="w-full" />
          </UFormField>

          <UFormField :label="$t('clients.tags')" name="tags" :hint="$t('common.pressEnter')">
            <UInputTags v-model="state.tags" :placeholder="$t('clients.tagsPlaceholder')" class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.address')" name="address" class="sm:col-span-2">
            <UInput v-model="state.address" :placeholder="$t('clients.addressPlaceholder')" icon="i-lucide-map-pin" class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.notes')" name="notes" class="sm:col-span-2">
            <UTextarea
              v-model="state.notes"
              :rows="2"
              :placeholder="$t('clients.notesPlaceholder')"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <UButton variant="ghost" color="neutral" :disabled="pending" @click="() => { open = false }">
            {{ $t('common.cancel') }}
          </UButton>
          <UButton type="submit" :loading="pending" :icon="isEdit ? 'i-lucide-save' : 'i-lucide-user-plus'">
            {{ isEdit ? $t('common.saveChanges') : $t('clients.addClient') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
