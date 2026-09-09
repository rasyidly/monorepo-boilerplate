<script lang="ts" setup>
import type { ButtonProps, ModalProps } from '@nuxt/ui'

const props = defineProps<{
  modal?: ModalProps
  icon?: string
  title?: string
  color?: ButtonProps['color']
  description?: string
  cancel?: ButtonProps
  confirm?: ButtonProps
  slots?: {
    body(props?: object): unknown
  }
}>()
</script>

<template>
  <UModal v-bind="props.modal">
    <template #description />
    <template #body>
      <UPageCard
        :title="props.title || `Are you sure?`"
        :description="props.description || `This action cannot be undone.`"
        class="text-center py-2"
        variant="naked"
        :ui="{ body: 'w-full', leading: 'mx-auto' }"
      >
        <template #leading>
          <UBadge
            :icon="props.icon || 'i-lucide-alert-triangle'"
            :color="props.color || 'neutral'"
            variant="soft"
            size="xl"
            class="p-3"
          />
        </template>
        <template v-if="props.slots?.body">
          <component :is="props.slots.body" />
        </template>
      </UPageCard>
    </template>
    <template #footer="{ close }">
      <UButton
        v-bind="props.cancel"
        block
        @click="close"
      />
      <UButton
        v-bind="props.confirm"
        block
        :ui="{ label: 'justify-start' }"
        @click.passive="close"
      />
    </template>
  </UModal>
</template>
