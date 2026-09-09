<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core'
</script>

<template>
  <UButton
    class="rounded-[50px_var(--ui-radius)_var(--ui-radius)_50px] ps-4 h-16"
    variant="outline"
    icon="i-lucide-alarm-clock"
    :ui="{ leadingIcon: 'text-dimmed' }"
  >
    On Absence Create
    <Handle
      type="source"
      :position="Position.Right"
      :connectable-end="false"
    />
  </UButton>
</template>
