<script setup lang="ts" generic="T">
type Model = T | null | undefined

const emit = defineEmits<{
  submit: [value: unknown]
}>()

const props = defineProps<{
  label?: string
  state?: T
  class?: string
}>()

const open = ref(false)

const [model, modifiers] = defineModel<Model>({
  required: true
})

// ── Committed label ─────────────────────────────────────────────────────
// The cell label only changes on Set NULL / Save (via refetch) or external
// updates. While the popover is open, the live editor mutates the row source
// (and thus `props.label`) — those changes must not leak into the label, and
// cancelling must restore the pre-edit label.
const label = ref<string | null | undefined>(props.label)

let labelAtSession: string | null | undefined
let committed = false

watch(() => open.value, (isOpen, wasOpen) => {
  if (isOpen) {
    labelAtSession = label.value
    committed = false
  } else if (wasOpen && !committed) {
    // dismissed without saving (Cancel / outside click) → restore pre-edit label
    nextTick(() => {
      label.value = labelAtSession ?? label.value
    })
  }
})

// External label updates (e.g. refetch) apply outside an edit session.
watch(() => props.label, (v) => {
  if (!open.value) label.value = v
})

const submit = (forceValue?: Model) => {
  committed = true
  if (forceValue !== undefined)
    model.value = forceValue
  // `model.value` reads the parent prop, so a forced write (Set NULL) is not
  // reflected locally yet — emit the resolved value instead of the stale prop.
  emit('submit', forceValue !== undefined ? forceValue : model.value)
  // adopt the current committed value — for references (`author`) the prop is
  // unchanged until refetch, so the name is preserved and updates afterwards.
  // Set NULL clears the label immediately instead of waiting for the refetch.
  label.value = forceValue === null ? null : (props.label ?? label.value)
  open.value = false
}

defineSlots<{
  default: []
  label(props: { label?: string | null }): VNode
}>()
</script>

<template>
  <UPopover
    ref="popover"
    v-model:open="open"
    :content="{ align: 'start' }"
    :ui="{ content: 'p-3!' }"
  >
    <div :class="['inline-flex', 'items-center', 'gap-1', 'group', 'cursor-pointer', props.class]">
      <NullContent v-if="model === null && !$slots.default" />
      <slot
        name="label"
        :label="label"
      >
        <span>{{ label }}</span>
      </slot>
      <UButton
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-pencil"
        square
        :ui="{ leadingIcon: 'size-3' }"
      />
    </div>

    <template #content>
      <slot />
      <div
        class="mt-2 flex justify-between gap-1"
      >
        <UButton
          label="Cancel"
          variant="soft"
          size="sm"
          tabindex="-1"
          @click="open = false"
        />
        <div class="grow" />
        <UButton
          v-if="modifiers.nullable"
          label="Set NULL"
          variant="soft"
          size="sm"
          tabindex="-1"
          @click="submit(null)"
        />
        <UButton
          label="Save"
          size="sm"
          @click="submit()"
        />
      </div>
    </template>
  </UPopover>
</template>
