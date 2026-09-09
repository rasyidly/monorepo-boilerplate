<script setup lang="ts">
const open = ref(false)

const search = ref('')
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      class="bg-elevated/25 [&>div]"
      :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }"
      :default-size="18"
    >
      <template #header>
        <UInput
          v-model="search"
          type="search"
          icon="i-lucide-file-search"
          placeholder="Search workflow..."
        />
      </template>
      <UEmpty
        title="Coming soon"
        description="We are working on it, please come back later"
        class="h-full"
      />
    </UDashboardSidebar>
    <NuxtPage />
  </div>
</template>
