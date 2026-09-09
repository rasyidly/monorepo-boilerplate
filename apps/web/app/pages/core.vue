<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js'

const open = ref(false)

const links = [[{
  label: 'Dashboard',
  icon: 'i-lucide-layout-dashboard',
  exact: true,
  to: '/core'
}, {
  label: 'CMS',
  type: 'label'
}, {
  label: 'Posts',
  icon: 'i-lucide-newspaper',
  to: '/core/posts'
}], [{
  label: 'Settings',
  type: 'label'
}, {
  label: 'Organization',
  icon: 'i-lucide-settings',
  defaultOpen: true,
  children: [{
    label: 'Settings',
    to: '/core/organization',
    exact: true
  }, {
    label: 'Members',
    to: '/core/organization/members'
  }]
}]] satisfies NavigationMenuItem[][]
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardSidebar
      id="core"
      v-model:open="open"
      collapsible
      class="bg-elevated/25 [&>div]"
      :ui="{ header: 'border-b border-default', footer: 'border-t border-default' }"
      :default-size="18"
    >
      <template #header="{ collapsed }">
        <OrganizationSwitcher v-slot="{ activeOrganization }">
          <UButton
            :square="collapsed"
            variant="ghost"
            :avatar="activeOrganization ? { alt: activeOrganization?.name } : { icon: 'i-lucide-building' } "
            :label="!collapsed ? (activeOrganization?.name || 'Loading ...') : undefined"
            class="font-semibold"
            block
            :ui="{ trailingIcon: 'text-dimmed/50' }"
            :trailing-icon="!collapsed ? 'i-lucide-chevrons-up-down' : undefined"
          />
        </OrganizationSwitcher>
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          popover
          class="mt-auto"
        />
      </template>
    </UDashboardSidebar>
    <NuxtPage />
  </div>
</template>
