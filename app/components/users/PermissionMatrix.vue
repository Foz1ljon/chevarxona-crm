<script setup lang="ts">
import type { Permission } from '#shared/utils/permissions'

const props = defineProps<{
  groups: Record<string, { label: string, permissions: Record<string, string> }>
  disabled?: boolean
  /** Shown as already-granted and locked — e.g. permissions inherited from a role. */
  inherited?: Permission[]
}>()

const model = defineModel<Permission[]>({ default: () => [] })

const { permission: permissionLabel, permissionGroup } = useLabels()

const selected = computed({
  get: () => new Set(model.value),
  set: value => { model.value = [...value] }
})

function isChecked(permission: string) {
  return selected.value.has(permission as Permission) || (props.inherited ?? []).includes(permission as Permission)
}

function isLocked(permission: string) {
  return props.disabled || (props.inherited ?? []).includes(permission as Permission)
}

function toggle(permission: string, value: boolean) {
  const next = new Set(model.value)
  if (value) next.add(permission as Permission)
  else next.delete(permission as Permission)
  model.value = [...next]
}

function groupState(groupKey: string) {
  const keys = Object.keys(props.groups[groupKey]!.permissions)
  const checked = keys.filter(key => isChecked(key)).length
  return { checked, total: keys.length, all: checked === keys.length, some: checked > 0 && checked < keys.length }
}

function toggleGroup(groupKey: string) {
  const keys = Object.keys(props.groups[groupKey]!.permissions).filter(key => !isLocked(key))
  const state = groupState(groupKey)
  const next = new Set(model.value)

  for (const key of keys) {
    if (state.all) next.delete(key as Permission)
    else next.add(key as Permission)
  }

  model.value = [...next]
}
</script>

<template>
  <div class="space-y-4">
    <div
      v-for="(group, groupKey) in groups"
      :key="groupKey"
      class="rounded-lg ring ring-default overflow-hidden"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-elevated/50 border-b border-default">
        <div class="flex items-center gap-2 min-w-0">
          <h4 class="text-sm font-medium text-highlighted">
            {{ permissionGroup(groupKey as string, group.label) }}
          </h4>
          <UBadge
            :label="`${groupState(groupKey).checked}/${groupState(groupKey).total}`"
            size="sm"
            variant="subtle"
            :color="groupState(groupKey).all ? 'success' : groupState(groupKey).some ? 'warning' : 'neutral'"
          />
        </div>

        <UButton
          v-if="!disabled"
          size="xs"
          variant="ghost"
          color="neutral"
          @click="toggleGroup(groupKey)"
        >
          {{ groupState(groupKey).all ? $t('roles.clearAll') : $t('roles.selectAll') }}
        </UButton>
      </div>

      <ul class="divide-y divide-default">
        <li
          v-for="(description, permission) in group.permissions"
          :key="permission"
          class="flex items-start gap-3 px-4 py-2.5"
          :class="isLocked(permission) && !disabled ? 'bg-elevated/30' : ''"
        >
          <UCheckbox
            :model-value="isChecked(permission)"
            :disabled="isLocked(permission)"
            class="mt-0.5"
            :aria-label="permissionLabel(permission as string, description)"
            @update:model-value="value => toggle(permission, Boolean(value))"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-toned">
              {{ permissionLabel(permission as string, description) }}
            </p>
            <p class="text-[11px] text-dimmed font-mono">
              {{ permission }}
              <span v-if="(inherited ?? []).includes(permission as never)" class="font-sans text-info">
                · {{ $t('roles.fromRole') }}
              </span>
            </p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
