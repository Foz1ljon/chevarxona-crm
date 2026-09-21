<script setup lang="ts">
import { type CalendarDate, getLocalTimeZone, parseDate, today } from '@internationalized/date'

/**
 * Date field that opens a real calendar instead of the browser's native picker.
 *
 * The value stays a plain `YYYY-MM-DD` string so it round-trips straight into
 * the API, while `@internationalized/date` objects bridge to `UCalendar`.
 */
const model = defineModel<string | null>({ default: null })

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
  min?: string | null
  max?: string | null
  icon?: string
  size?: 'sm' | 'md' | 'lg'
}>(), {
  placeholder: '',
  disabled: false,
  icon: 'i-lucide-calendar',
  size: 'md'
})

const { t } = useI18n()
const { formatDate } = useFormat()

const open = ref(false)

function toCalendar(value?: string | null): CalendarDate | undefined {
  if (!value) return undefined
  try {
    return parseDate(value.slice(0, 10))
  } catch {
    return undefined
  }
}

const selected = computed({
  get: () => toCalendar(model.value),
  set: (value: CalendarDate | undefined) => { model.value = value ? value.toString() : null }
})

const minValue = computed(() => toCalendar(props.min))
const maxValue = computed(() => toCalendar(props.max))

function setToday() {
  model.value = today(getLocalTimeZone()).toString()
  open.value = false
}

function clear() {
  model.value = null
  open.value = false
}
</script>

<template>
  <div class="relative">
    <UPopover v-model:open="open" :content="{ align: 'start' }" :ui="{ content: 'p-0 overflow-hidden' }">
      <UButton
        color="neutral"
        variant="outline"
        :size="size"
        :disabled="disabled"
        :icon="icon"
        class="w-full justify-start font-normal data-[state=open]:ring-primary"
        :class="open ? 'ring-2 ring-primary/40' : ''"
      >
        <span class="truncate" :class="model ? 'text-highlighted' : 'text-dimmed'">
          {{ model ? formatDate(model) : (placeholder || t('common.pickDate')) }}
        </span>
        <template #trailing>
          <UIcon
            :name="model && !disabled ? 'i-lucide-x' : 'i-lucide-chevron-down'"
            class="size-3.5 text-dimmed ms-auto"
            @click.stop="model && clear()"
          />
        </template>
      </UButton>

      <template #content>
        <div class="flex flex-col">
          <UCalendar
            v-model="selected"
            :min-value="minValue"
            :max-value="maxValue"
            class="p-3"
            @update:model-value="open = false"
          />

          <div class="flex items-center justify-between gap-2 px-3 py-2 border-t border-default bg-elevated/40">
            <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-calendar-clock" @click="setToday">
              {{ t('common.today') }}
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-eraser"
              :disabled="!model"
              @click="clear"
            >
              {{ t('common.clear') }}
            </UButton>
          </div>
        </div>
      </template>
    </UPopover>
  </div>
</template>
