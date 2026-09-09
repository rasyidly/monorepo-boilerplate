<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, AuthFormField, ButtonProps } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const signInEmail = useSignIn('email')

const route = useRoute()
const toast = useToast()
const form = useTemplateRef('form')

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox'
}]

const providers = ref<ButtonProps[]>([{
  label: 'Google',
  icon: 'i-logos-google-icon',
  disabled: true
}])

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string('Password is required').min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  try {
    await signInEmail.execute(payload.data, {
      onSuccess: () => {
        toast.add({
          description: `Welcome back, ${payload.data.email}!`
        })
        navigateTo(route.query.redirect as string || '/core')
      },
      onError: (error) => {
        toast.add({
          description: error.response.statusText || 'Invalid credentials. Please try again.'
        })
      }
    })
  } catch (error) {
    toast.add({
      description: error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
    })
  }
}

useHead({
  title: 'Sign In'
})

onMounted(() => {
  if (form.value?.state && process.env.NODE_ENV === 'development') {
    Object.assign(form.value?.state, {
      email: 'test@example.com',
      password: 'password'
    })
  }
})
</script>

<template>
  <UAuthForm
    ref="form"
    :schema="schema"
    title="Welcome Back!"
    description="Enter your credentials to access your account."
    icon="i-custom-brand"
    :fields="fields"
    :providers="providers"
    separator="OR"
    loading-auto
    @submit="onSubmit"
  >
    <template #password-hint>
      <UButton
        variant="link"
        color="neutral"
        label="Forgot password?"
        class="p-0"
        to="/auth/forgot-password"
      />
    </template>
    <template #footer>
      <div class="text-center">
        Don't have an account?
        <NuxtLink
          to="/auth/signup"
          class="text-primary font-medium"
        >Sign up</NuxtLink>
      </div>
    </template>
  </UAuthForm>
</template>
