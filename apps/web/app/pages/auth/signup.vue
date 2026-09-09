<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField, ButtonProps } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const signUpEmail = useSignUp('email')

const toast = useToast()
const route = useRoute()

const fields: AuthFormField[] = [{
  name: 'name',
  type: 'text',
  label: 'Full Name',
  required: true
}, {
  name: 'email',
  type: 'email',
  label: 'Enter your Email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  required: true
}, {
  name: 'confirmPassword',
  label: 'Repeat Password',
  type: 'password',
  required: true
}]

const providers = ref<ButtonProps[]>([{
  label: 'Google',
  icon: 'i-logos-google-icon',
  disabled: true
}])

const schema = z.object({
  name: z.string('Name is required').min(1, 'Name is required'),
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string('Confirm Password is required').min(8, 'Must be at least 8 characters')
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await signUpEmail.execute(payload.data, {
      onSuccess: () => {
        toast.add({
          description: `Welcome, ${payload.data.name}!`
        })
        navigateTo(route.query.redirect as string || '/')
      },
      onError: (error) => {
        toast.add({
          description: error.response.statusText || 'Something went wrong. Please try again.'
        })
      }
    })
  } catch (error) {
    toast.add({
      description: error instanceof Error ? error.message : 'Something went wrong. Please try again.'
    })
  }
}

useHead({
  title: 'Sign Up'
})
</script>

<template>
  <UAuthForm
    :schema="schema"
    title="Create Account"
    description="Enter your details to create a new account."
    icon="i-custom-brand"
    :fields="fields"
    :providers="providers"
    separator="OR"
    loading-auto
    @submit="onSubmit"
  >
    <template #footer>
      <div class="text-sm text-center">
        Already have an account?
        <NuxtLink
          to="/auth/signin"
          class="text-primary font-medium"
        >Sign in</NuxtLink>
      </div>
    </template>
  </UAuthForm>
</template>
