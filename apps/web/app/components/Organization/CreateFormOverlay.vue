<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const client = useAuthClient()
const toast = useToast()
const form = useTemplateRef('form')

const props = withDefaults(defineProps<{
  defaultOpen?: boolean
  dismissible?: boolean
  close?: boolean
  cancel?: boolean
}>(), {
  defaultOpen: false,
  dismissible: true,
  close: true,
  cancel: true
})

const emit = defineEmits<{
  afterCreate: []
}>()

const open = ref(props.defaultOpen)
const creating = ref(false)

const schema = z.object({
  name: z.string('Name is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: undefined
})

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (!client) return
  creating.value = true
  try {
    const { error } = await client.organization.create({
      name: payload.data.name,
      slug: slugify(payload.data.name)
    })
    if (error) throw new Error(error.message)

    toast.add({
      description: `The organization ${state.name} has been created successfully.`
    })

    open.value = false
    emit('afterCreate')
  } catch (error) {
    handleError(error, form)
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :dismissible="props.dismissible"
    :close="props.close"
    title="Create Organization"
    description="Enter your organization details to get started."
    :ui="{
      title: 'font-normal text-xl',
      content: 'max-w-md'
    }"
  >
    <template #body>
      <UForm
        ref="form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          label="Organization Name"
          name="name"
        >
          <UInput v-model="state.name" />
        </UFormField>
      </UForm>
    </template>
    <template #footer="{ close: closeModal }">
      <UButton
        v-if="props.cancel"
        label="Cancel"
        color="neutral"
        variant="subtle"
        block
        @click="closeModal"
      />
      <UButton
        label="Create organization"
        icon="i-lucide-plus"
        :loading="creating"
        block
        @click="form?.submit()"
      />
    </template>
  </UModal>
</template>
