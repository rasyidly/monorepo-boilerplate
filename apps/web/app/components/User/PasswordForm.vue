<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const client = useAuthClient()
const toast = useToast()

const schema = z.object({
  currentPassword: z.string('Current password is required'),
  newPassword: z.string('New password is required').min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string('Password confirmation is required').min(1, 'Password confirmation is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const accounts = ref<{ providerId: string }[]>([])

const hasPasswordAccount = computed(() => accounts.value.some(account => account.providerId === 'credential'))

onMounted(async () => {
  try {
    const { data, error } = await client?.listAccounts() ?? {}

    if (error) throw new Error(error.message)

    accounts.value = data ?? []
  } catch {
    accounts.value = []
  }
})

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  try {
    const { error } = await client?.changePassword({
      currentPassword: state.currentPassword!,
      newPassword: state.newPassword!,
      revokeOtherSessions: true
    }) ?? {}

    if (error) throw new Error(error.message)

    toast.add({
      description: 'Password changed successfully'
    })
    state.currentPassword = ''
    state.newPassword = ''
    state.confirmPassword = ''
  } catch (error) {
    handleError(error)
  }
}
</script>

<template>
  <UAlert
    v-if="!hasPasswordAccount"
    title="You don't have a password yet (signed in via Google/OAuth)"
    description="Use the Forgot Password feature on the sign-in page to create one."
  />

  <UForm
    v-else
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField
      name="currentPassword"
      label="Current Password"
      required
    >
      <UInput
        v-model="state.currentPassword"
        type="password"
      />
    </UFormField>

    <UFormField
      name="newPassword"
      label="New Password"
      required
    >
      <UInput
        v-model="state.newPassword"
        type="password"
        placeholder="At least 8 characters"
      />
    </UFormField>

    <UFormField
      name="confirmPassword"
      label="Confirm New Password"
      required
    >
      <UInput
        v-model="state.confirmPassword"
        type="password"
      />
    </UFormField>

    <UButton
      type="submit"
      icon="i-lucide-check"
      label="Change Password"
      loading-auto
    />
  </UForm>
</template>
