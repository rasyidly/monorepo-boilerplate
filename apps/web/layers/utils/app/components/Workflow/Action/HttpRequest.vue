<script lang="ts" setup>
import { Handle, Position } from '@vue-flow/core'
</script>

<template>
  <UButton
    class="h-16"
    variant="outline"
    icon="i-lucide-globe"
    :ui="{ leadingIcon: 'text-dimmed' }"
  >
    HTTP Request
    <Handle
      type="target"
      :position="Position.Left"
    />
    <Handle
      type="source"
      :position="Position.Right"
    />
  </UButton>
</template>
