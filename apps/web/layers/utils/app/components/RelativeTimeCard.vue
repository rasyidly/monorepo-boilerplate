<script setup lang="ts" generic="T">
const props = withDefaults(defineProps<{
  label?: string
  date?: Date | null
}>(), {
  date: null
})

const timeAgo = useTimeAgo(props.date ?? new Date())
const utcDisplay = computed(() => props.date?.toUTCString())
const localDisplay = computed(() => props.date?.toLocaleString(undefined, {
  dateStyle: 'full',
  timeStyle: 'long'
}) ?? '')
</script>

<template>
  <NullContent v-if="props.date === null" />
  <UPopover
    v-else
    mode="hover"
    :content="{ align: 'start' }"
    :ui="{ content: 'p-3 space-y-1' }"
  >
    <slot
      v-if="label"
      name="label"
      :label="label"
      :date="props.date"
    >
      <span class="decoration-dotted underline underline-offset-3 decoration-neutral-500/40">{{ label }}</span>
    </slot>

    <template
      v-if="props.date"
      #content
    >
      <p class="text-sm">
        {{ timeAgo }}
      </p>
      <p class="text-xs text-muted">
        {{ localDisplay }}
      </p>
      <div class="flex items-center gap-2 text-muted text-xs mt-2">
        <UBadge
          label="UTC"
          color="neutral"
          variant="subtle"
          size="sm"
        />
        {{ utcDisplay }}
      </div>
    </template>
  </UPopover>
</template>
