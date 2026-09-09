<script setup lang="ts">
// [TODO] EMAIL VERIFICATION NOT YET AVAILABLE FOR NOW

definePageMeta({
  layout: 'auth',
  auth: false
})

const client = useAuthClient()
const toast = useToast()

async function resendEmailVerification() {
  try {
    await client?.sendVerificationEmail({
      email: '',
      callbackURL: '/auth/signin'
    })

    toast.add({
      description: 'Verification email sent. Please check your inbox.'
    })
  } catch (error) {
    toast.add({
      description: error instanceof Error ? error.message : 'Invalid credentials. Please try again.'
    })
  }
}

useHead({
  title: 'Verify Email'
})
</script>

<template>
  <div>
    <UPageCard
      icon="i-custom-brand"
      variant="naked"
      class="text-center"
      title="Check your email"
      description="We sent a confirmation link to your email. Click the link to activate your account."
      :ui="{
        body: 'mx-auto',
        title: 'font-normal text-2xl',
        leading: 'mx-auto',
        leadingIcon: 'size-12 text-current mb-4'
      }"
    >
      <div class="text-center">
        Didn't receive it?
        <UButton
          variant="link"
          class="font-medium p-0 text-base"
          label="Resend Email"
          loading-auto
          @click="resendEmailVerification"
        />
      </div>
    </UPageCard>
  </div>
</template>
