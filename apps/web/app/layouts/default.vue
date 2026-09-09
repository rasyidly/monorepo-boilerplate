<script setup lang="ts">
import type { NavigationMenuItem, CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { provideQuerySettingsContext } from 'zenstack-pinia-colada'

const runtimeConfig = useRuntimeConfig()
const { user } = useUserSession()
const client = useAuthClient()
const color = useColorMode()

provideQuerySettingsContext({
  endpoint: `${runtimeConfig.public.apiUrl}/model`,
  logging: true
})

const activeOrganization = client?.useActiveOrganization()

const aiAgent = useLocalStorage('aiAgent', false)

const modules = [[{
  label: 'Core',
  icon: 'i-lucide-box',
  to: '/core'
}, {
  label: 'Workflows',
  icon: 'i-lucide-workflow',
  to: '/workflows'
}], [{
  label: 'File Manager',
  icon: 'i-lucide-folder',
  to: '/storage'
}, {
  label: 'Logs',
  icon: 'i-lucide-logs',
  to: '/logs'
}]]

const globalLinks = computed<NavigationMenuItem[][]>(() => [[{
  label: 'AI Agent',
  icon: 'i-lucide-sparkles',
  kbds: ['shift', 'i'],
  onSelect: () => {
    aiAgent.value = !aiAgent.value
  },
  ui: {
    linkLeadingIcon: aiAgent.value ? 'text-primary hover:text-primary focus:text-primary' : undefined
  }
}], [{
  label: 'System Settings',
  icon: 'i-lucide-settings'
}, {
  label: 'Users',
  icon: 'i-lucide-users',
  to: '/users'
}], [{
  label: 'Notifications',
  icon: 'i-lucide-bell'
}, {
  label: 'Toggle theme',
  icon: color.preference === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon',
  kbds: ['shift', 'd'],
  onSelect: () => {
    color.preference = color.value === 'dark' ? 'light' : 'dark'
  }
}]])

const groups = computed<CommandPaletteGroup[]>(() => [{
  id: 'modules',
  label: 'Module',
  items: modules.flat() as CommandPaletteItem[]
}, {
  id: 'general',
  label: 'General',
  items: globalLinks.value.flat().filter(link => link.label !== 'Toggle theme') as CommandPaletteItem[]
}])

defineShortcuts(extractShortcuts(globalLinks.value))
</script>

<template>
  <UDashboardGroup
    unit="rem"
  >
    <div class="flex overflow-auto border-e border-default">
      <UDashboardPanel
        id="nav-main"
        :ui="{ body: 'px-2.5 sm:px-4 py-2.5!' }"
        class="bg-elevated/50"
        :max-size="3"
        :min-size="3"
        :default-size="3"
      >
        <template #header>
          <UDashboardToolbar
            :ui="{ root: 'px-2.5 sm:px-4 h-(--ui-header-height)' }"
          >
            <UButton
              square
              variant="soft"
              icon="i-custom-brand"
            />
          </UDashboardToolbar>
        </template>
        <template #body>
          <UNavigationMenu
            collapsed
            :items="modules"
            orientation="vertical"
            tooltip
            popover
            highlight
          >
            <template #list-leading>
              <UTooltip
                text="Search"
                :content="{ side: 'right' }"
                :delay-duration="0"
              >
                <UDashboardSearchButton
                  collapsed
                />
              </UTooltip>
              <USeparator />
            </template>
          </UNavigationMenu>
          <div class="grow" />
          <UNavigationMenu
            collapsed
            :items="globalLinks"
            orientation="vertical"
            tooltip
            popover
          />
        </template>
        <template #footer>
          <UDashboardToolbar :ui="{ root: 'px-2.5 sm:px-4' }">
            <UserMenu>
              <UAvatar
                :alt="user?.name"
                class="cursor-pointer"
              />
            </UserMenu>
          </UDashboardToolbar>
        </template>
      </UDashboardPanel>
    </div>

    <UDashboardSearch :groups="groups" />
    <OrganizationCreateFormOverlay
      v-if="!activeOrganization?.isPending && !activeOrganization?.data"
      default-open
      :dismissible="false"
      :close="false"
      :cancel="false"
    />
    <div
      v-show="activeOrganization?.data"
      class="flex flex-1 overflow-auto"
    >
      <slot />
    </div>
    <UDashboardPanel
      v-if="aiAgent"
      id="ai-agent"
      :min-size="20"
      :max-size="20"
      :default-size="20"
      :ui="{ body: 'relative' }"
      class="border-s border-default"
    >
      <template #header>
        <UDashboardNavbar
          icon="i-lucide-sparkles"
          title="AI Agent"
        />
      </template>
      <template #body>
        <div
          class="absolute inset-0 z-[-2] bg-transparent bg-[radial-gradient(var(--ui-bg-accented)_1px,var(--ui-bg)_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_100%_60%_at_50%_0%,#000_40%,transparent_100%)]"
        />
        <UEmpty
          title="Ready to Get Started"
          description="Ask me anything"
          class="h-full"
        >
          <template #leading>
            <UIcon
              name="i-lucide-bot"
              class="mb-4 size-6"
            />
          </template>
        </UEmpty>
      </template>
      <template #footer>
        <UChatPrompt
          variant="naked"
          class="w-full border-t border-default rounded-none"
          :ui="{ base: 'text-sm px-2 min-h-12 max-h-32 overflow-y-auto' }"
          :autofocus="false"
        >
          <template #footer>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="ghost"
              size="xs"
            />
            <div class="flex items-center gap-1.5">
              <UChatPromptSubmit size="xs" />
            </div>
          </template>
        </UChatPrompt>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
