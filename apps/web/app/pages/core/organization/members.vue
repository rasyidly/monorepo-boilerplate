<script setup lang="ts">
useHead({
  title: 'Members'
})
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <UDashboardPanel
      id="organization-members"
      :ui="{ body: 'p-0!' }"
    >
      <template #header>
        <UDashboardNavbar title="Members">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <div
              id="organization-members_right"
              class="flex items-center shrink-0 gap-1.5"
            />
          </template>
        </UDashboardNavbar>
        <UDashboardToolbar>
          <UNavigationMenu
            highlight
            highlight-color="primary"
            c
            class="-mx-1"
            :items="[{
              icon: 'i-lucide-users',
              label: 'Members',
              to: '/core/organization/members',
              exact: true
            }, {
              icon: 'i-lucide-mail-plus',
              label: 'Invitations',
              to: '/core/organization/members/invitations'
            }]"
          />
        </UDashboardToolbar>
      </template>
      <template #body>
        <NuxtPage />
      </template>
    </UDashboardPanel>
  </div>
</template>
