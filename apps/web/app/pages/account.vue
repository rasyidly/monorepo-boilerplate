<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui/runtime/components/NavigationMenu.vue.js'

const { user, signOut } = useUserSession()

const open = ref(false)

const links = [[{
  label: 'My Account',
  type: 'label' as const
}, {
  label: 'Profile',
  icon: 'i-lucide-user',
  exact: true,
  to: '/account',
  onSelect: () => {
    open.value = false
  }
},
{
  label: 'Preferences',
  icon: 'i-lucide-settings-2',
  kbds: [',']
}], [{
  label: 'Logout',
  icon: 'i-lucide-log-out',
  color: 'error',
  onSelect: () => signOut({
    onSuccess: () => {
      navigateTo('/auth/signin')
    }
  })
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
        <UUser
          :name="collapsed ? undefined : user?.name"
          :description="collapsed ? undefined : user?.email"
          :avatar="{
            alt: user?.name
          }"
        />
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
