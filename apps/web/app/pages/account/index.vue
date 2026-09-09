<script setup lang="ts">
definePageMeta({
  auth: {
    only: 'user',
    redirectTo: '/auth/signin'
  }
})

useHead({
  title: 'Profile'
})
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardPanel
      id="account-index"
    >
      <template #header>
        <UDashboardNavbar title="Profile">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UContainer class="space-y-4 sm:space-y-6 max-w-4xl">
          <UPageCard
            title="Profile Information"
            description="View and update your profile information."
          >
            <UserProfileForm />
          </UPageCard>
          <UPageCard
            title="Change Password"
            description="Update your password."
          >
            <UserPasswordForm />
          </UPageCard>
          <UPageCard
            title="Email"
            description="Update your email."
          >
            <UserEmailForm />
          </UPageCard>
          <UPageCard
            title="Danger Zone"
            description="Be careful with this action."
            class="ring-error"
          >
            <UserAccountDeletion />
          </UPageCard>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
