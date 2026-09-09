<script setup lang="ts">
useHead({
  title: 'Workflows'
})
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardPanel
      id="workflows-index"
      :ui="{ body: 'p-0!' }"
    >
      <template #header>
        <UDashboardNavbar title="Workflows" />
      </template>
      <template #body>
        <WorkflowEditor />
      </template>
    </UDashboardPanel>
  </div>
</template>
