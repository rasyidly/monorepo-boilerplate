<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { user, updateUser } = useUserSession()
const toast = useToast()

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: user.value?.name ?? ''
})

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  try {
    await updateUser({ name: state.name!.trim() })
    toast.add({ description: 'Profile updated successfully' })
  } catch (error) {
    toast.add({ description: error instanceof Error ? error.message : 'Failed to update profile' })
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <div class="flex items-center gap-4">
      <UAvatar
        :src="user?.image ?? undefined"
        :alt="state.name || 'User'"
        size="xl"
      />
      <div class="space-y-0.5">
        <p class="font-medium text-sm">
          {{ state.name || 'User' }}
        </p>
        <p class="text-sm text-muted-foreground">
          {{ user?.email }}
        </p>
      </div>
    </div>

    <UFormField
      name="name"
      label="Full Name"
      required
    >
      <UInput
        v-model="state.name"
        placeholder="Your name"
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
