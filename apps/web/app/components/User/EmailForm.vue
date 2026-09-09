<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const client = useAuthClient()
const { user } = useUserSession()
const toast = useToast()

const isEmailVerified = computed(() => user.value?.emailVerified === true)

const schema = z.object({
  newEmail: z.string().trim().email('Invalid email')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  newEmail: ''
})

const sendingVerification = ref(false)
const changingEmail = ref(false)

async function sendVerification() {
  if (!client || !user.value) return
  sendingVerification.value = true
  try {
    const { error } = await client.sendVerificationEmail({
      email: user.value.email,
      callbackURL: '/account'
    })
    if (error) throw new Error(error.message)
    toast.add({ description: 'Verification email sent, check your inbox' })
  } catch (error) {
    toast.add({ description: error instanceof Error ? error.message : 'Failed to send verification email' })
  } finally {
    sendingVerification.value = false
  }
}

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  if (!client || !user.value) return

  if (state.newEmail!.trim() === user.value.email) {
    toast.add({ description: 'New email is the same as the current email' })
    return
  }

  changingEmail.value = true

  try {
    const { error } = await client.changeEmail({
      newEmail: state.newEmail!.trim(),
      callbackURL: '/account'
    })
    if (error) throw new Error(error.message)
    toast.add({ description: 'A confirmation email has been sent to your current address. Please confirm.' })
  } catch (error) {
    handleError(error)
    changingEmail.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UPageCard
      orientation="horizontal"
      :title="user?.email"
      variant="naked"
      :ui="{ title: 'text-sm' }"
    >
      <div class="flex flex-wrap justify-end gap-1">
        <UBadge
          v-if="isEmailVerified"
          icon="i-lucide-circle-check"
          color="success"
          variant="soft"
          label="Verified"
        />
        <UBadge
          v-else
          icon="i-lucide-circle-x"
          color="error"
          variant="soft"
          label="Not verified"
        />
        <UButton
          v-if="!isEmailVerified"
          variant="outline"
          class="lg:justify-self-end"
          :label="sendingVerification ? 'Sending...' : 'Resend Verification'"
          :loading="sendingVerification"
          @click="sendVerification"
        />
      </div>
    </UPageCard>

    <UForm
      :schema="schema"
      :state="state"
      class="space-y-3"
      @submit="onSubmit"
    >
      <UFormField
        name="newEmail"
        label="Change Email"
        description="A confirmation email will be sent to your current address"
      >
        <UInput
          v-model="state.newEmail"
          type="email"
          class="flex-1"
        />
      </UFormField>
      <UButton
        type="submit"
        icon="i-lucide-send"
        label="Request Change"
        :loading="changingEmail"
        class="shrink-0"
      />
    </UForm>
  </div>
</template>
