<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const client = useAuthClient()

const toast = useToast()
const form = useTemplateRef('form')

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  required: true
}]

const schema = z.object({
  email: z.email('Invalid email')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await client?.requestPasswordReset({
      email: payload.data.email,
      redirectTo: `${location.origin}/auth/reset-password`
    })

    toast.add({
      description: 'If an account exists for this email, you will receive a password reset link shortly.'
    })

    navigateTo('/auth/signin')
  } catch (error) {
    toast.add({
      description: error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
    })
  }
}

useHead({
  title: 'Forgot Password'
})
</script>

<template>
  <UAuthForm
    ref="form"
    :schema="schema"
    title="Forgot your password?"
    description="Enter your email address and we will send you a link to reset your password."
    icon="i-custom-brand"
    :fields="fields"
    separator="OR"
    loading-auto
    @submit="onSubmit"
  >
    <template #footer>
      <div class="text-center">
        Remember your password?
        <NuxtLink
          to="/auth/signin"
          class="text-primary font-medium"
        >Sign in</NuxtLink>
      </div>
    </template>
  </UAuthForm>
</template>
