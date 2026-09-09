<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const client = useAuthClient()

const toast = useToast()
const route = useRoute()

const fields: AuthFormField[] = [{
  name: 'password',
  label: 'New Password',
  type: 'password',
  required: true
}, {
  name: 'confirmPassword',
  label: 'Repeat New Password',
  type: 'password',
  required: true
}]

const schema = z.object({
  password: z.string('Password is required').min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string('Confirm Password is required').min(8, 'Must be at least 8 characters')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (!client) return
  try {
    await client.resetPassword({
      newPassword: payload.data.password,
      token: route.query.token as string
    })

    toast.add({
      description: 'Password reset successfully'
    })

    navigateTo(route.query.redirect as string || '/auth/signin')
  } catch (error) {
    toast.add({
      description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    })
  }
}

useHead({
  title: 'Reset Password'
})
</script>

<template>
  <UAuthForm
    :schema="schema"
    title="Set a new password"
    description="Choose a strong password you haven't used before."
    icon="i-custom-brand"
    :fields="fields"
    separator="OR"
    loading-auto
    @submit="onSubmit"
  />
</template>
