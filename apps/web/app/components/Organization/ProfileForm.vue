<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const client = useAuthClient()
const toast = useToast()

const activeOrganization = client?.useActiveOrganization()

const schema = z.object({
  name: z.string('Name is required'),
  slug: z.string('Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: activeOrganization?.value.data?.name,
  slug: activeOrganization?.value.data?.slug
})

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  if (!client || !activeOrganization?.value.data) return
  try {
    const { error } = await client.organization.update({
      organizationId: activeOrganization?.value.data?.id,
      data: {
        name: state.name!.trim(),
        slug: slugify(state.slug!)
      }
    })
    if (error) throw new Error(error.message)
    toast.add({
      description: 'Organization profile updated successfully'
    })
  } catch (error) {
    handleError(error)
  }
}

watch(() => activeOrganization?.value, () => {
  if (activeOrganization?.value.data) {
    state.name = activeOrganization.value.data.name
    state.slug = activeOrganization.value.data.slug
  }
})
</script>

<template>
  <UEmpty
    v-if="!activeOrganization?.data"
    icon="i-lucide-building-2"
    title="No active organization"
    description="Create or switch to an organization to manage its settings."
  />
  <UForm
    v-else
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField
      name="name"
      label="Organization Name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="Acme Inc."
      />
    </UFormField>

    <UFormField
      name="slug"
      label="Organization Username"
      required
    >
      <UInput
        v-model="state.slug"
        placeholder="acme-inc"
      />
    </UFormField>

    <UButton
      type="submit"
      icon="i-lucide-check"
      label="Save Changes"
      loading-auto
    />
  </UForm>
</template>
