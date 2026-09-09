<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const client = useAuthClient()
const toast = useToast()
const route = useRoute()
const { loggedIn, ready } = useUserSession()

const invitationId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))

const accepting = ref(false)

async function accept() {
  if (!client || !invitationId.value) return
  accepting.value = true
  try {
    const { data, error } = await client.organization.acceptInvitation({
      invitationId: invitationId.value
    })
    if (error) throw new Error(error.message)
    else {
      toast.add({
        description: 'You have joined the organization'
      })
      navigateTo('/core')
    }
  } catch (error) {
    accepting.value = false
    handleError(error)
  }
}

watch(loggedIn, (value) => {
  if (value && invitationId.value) accept()
})

useHead({
  title: 'Accept Invitation'
})
</script>

<template>
  <UPageCard
    icon="i-custom-brand"
    variant="naked"
    class="text-center"
    title="You've been invited"
    :ui="{
      body: 'mx-auto',
      title: 'font-normal text-2xl',
      leading: 'mx-auto',
      leadingIcon: 'size-12 text-current mb-4'
    }"
  >
    <div class="flex flex-col items-center gap-4 text-center">
      <p
        v-if="!invitationId"
        class="text-muted text-sm"
      >
        This invitation link is invalid or has expired.
      </p>

      <template v-else-if="!ready">
        <USkeleton class="h-4 w-40" />
      </template>

      <template v-else-if="!loggedIn">
        <p class="text-muted text-sm">
          Sign in to accept this invitation and join the organization.
        </p>
        <UButton
          label="Sign in"
          icon="i-lucide-log-in"
          block
          :to="{ path: '/auth/signin', query: { redirect: route.fullPath } }"
        />
        <p class="text-muted text-sm">
          Or <NuxtLink
            class="text-primary"
            :to="{ path: '/auth/signup', query: { redirect: route.fullPath } }"
          >sign up</NuxtLink> to create a new account.
        </p>
      </template>

      <template v-else>
        <p class="text-muted text-sm">
          Accept the invitation to join the organization.
        </p>
        <UButton
          label="Accept Invitation"
          icon="i-lucide-check"
          block
          :loading="accepting"
          @click="accept"
        />
      </template>
    </div>
  </UPageCard>
</template>
