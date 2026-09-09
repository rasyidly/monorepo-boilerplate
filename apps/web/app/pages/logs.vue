<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { LogModule } from '@repo/db/enums'

const links = computed<NavigationMenuItem[][]>(() => [[{
  label: 'Modules',
  type: 'label'
}, ...LogModule.map(module => ({
  label: module.label,
  icon: module.icon,
  to: `/logs/${module.value}`
}))]])
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardSidebar
      id="logs"
      collapsible
      class="bg-elevated/25 [&>div]"
      :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }"
      :default-size="18"
    >
      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
          highlight
        />
      </template>
    </UDashboardSidebar>
    <NuxtPage />
  </div>
</template>
