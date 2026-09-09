<script setup lang="ts">
useHead({
  title: 'Organization Settings'
})
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardPanel id="core-organization-index">
      <template #header>
        <UDashboardNavbar title="Organization Settings">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UContainer class="space-y-4 sm:space-y-6 max-w-4xl">
          <UPageCard
            title="Organization Profile"
            description="View and update your organization profile."
          >
            <OrganizationProfileForm />
          </UPageCard>
        </UContainer>
      </template>
    </UDashboardPanel>
  </div>
</template>
