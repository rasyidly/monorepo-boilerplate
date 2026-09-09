<script setup lang="ts">
import type { NavigationMenuItem, CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { provideQuerySettingsContext } from 'zenstack-pinia-colada'
import { isReasoningUIPart, isTextUIPart, isToolUIPart, getToolName, lastAssistantMessageIsCompleteWithApprovalResponses, DefaultChatTransport } from 'ai'
import { useChat } from '@ai-sdk/vue'
import { isPartStreaming, isToolStreaming } from '@nuxt/ui/utils/ai'
import shiki from '@comark/nuxt/plugins/shiki'

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

const { messages, status, error, sendMessage, regenerate, stop, addToolApprovalResponse } = useChat({
  transport: new DefaultChatTransport({
    api: `${runtimeConfig.public.apiUrl}/chat/message`
  }),
  sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  onError(error) {
    console.error(error)
  }
})

const input = ref('')

function onSubmit() {
  if (!input.value.trim()) return

  sendMessage({ text: input.value })

  input.value = ''
}

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
        <UChatMessages
          v-if="messages.length"
          :messages="messages"
          :status="status"
          :assistant="{
            variant: 'soft',
            ui: {
              content: 'px-3 py-2 min-h-0 space-y-2 prose-sm',
              container: 'pb-4'
            }
          }"
          :user="{
            variant: 'subtle',
            ui: {
              content: 'px-3 py-2 min-h-0 prose-sm',
              container: 'pb-4'
            }
          }"
          class="text-sm"
          :ui="{
            root: 'px-0'
          }"
        >
          <template #content="{ message }">
            <template
              v-for="(part, index) in message.parts"
              :key="`${message.id}-${part.type}-${index}`"
            >
              <UChatReasoning
                v-if="isReasoningUIPart(part)"
                :text="part.text"
                :streaming="isPartStreaming(part)"
              />

              <UChatTool
                v-else-if="isToolUIPart(part)"
                :text="`Calling \'${getToolName(part)}\' tool`"
                :streaming="isToolStreaming(part)"
                :loading="isToolStreaming(part)"
                loading-icon="i-lucide-loader-circle"
                icon="i-lucide-search"
                :actions="part.state === 'approval-requested' ? [
                  { label: 'Approve', onClick: () => addToolApprovalResponse({ id: part.approval.id, approved: true }) },
                  { label: 'Deny', color: 'neutral', variant: 'ghost', onClick: () => addToolApprovalResponse({ id: part.approval.id, approved: false }) }
                ] : undefined"
              />

              <template v-else-if="isTextUIPart(part)">
                <Markdown
                  v-if="message.role === 'assistant'"
                  :value="part.text"
                  :streaming="isPartStreaming(part)"
                  :plugins="[shiki()]"
                  class="*:first:mt-0 *:last:mb-0"
                />
                <p
                  v-else-if="message.role === 'user'"
                  class="whitespace-pre-wrap mb-0"
                >
                  {{ part.text }}
                </p>
              </template>
            </template>
          </template>
        </UChatMessages>
        <UEmpty
          v-else
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
          v-model="input"
          variant="naked"
          class="w-full border-t border-default rounded-none"
          :ui="{ base: 'text-sm px-1 min-h-12 max-h-32 overflow-y-auto' }"
          :autofocus="false"
          :error="error"
          @submit="onSubmit"
        >
          <template #footer>
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="soft"
              size="sm"
              disabled
            />
            <UBadge
              color="neutral"
              icon="i-lucide-bot"
              variant="soft"
              size="lg"
              class="text-xs py-1.5 bg-transparent text-muted"
              :ui="{ leadingIcon: 'size-3.5' }"
              label="GPT-5 Nano"
            />
            <div class="grow" />
            <div class="flex items-center gap-1.5">
              <UChatPromptSubmit
                size="sm"
                :status="status"
                @stop="stop()"
                @reload="regenerate()"
              />
            </div>
          </template>
        </UChatPrompt>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
