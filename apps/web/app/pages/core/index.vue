<script setup lang="ts">
useHead({
  title: 'Dashboard'
})
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardPanel id="core-index">
      <template #header>
        <UDashboardNavbar title="Dashboard">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UEmpty
          title="Coming soon"
          description="We are working on this feature. Stay tuned!"
          class="h-full"
        />
      </template>
    </UDashboardPanel>
  </div>
</template>
