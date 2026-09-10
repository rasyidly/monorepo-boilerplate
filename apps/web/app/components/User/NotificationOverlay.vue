<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { Notification } from '@repo/db/schema'

const { public: { apiUrl } } = useRuntimeConfig()
const { client } = useDbClient()

const { data: notifications, asyncStatus, refresh } = client.notification.useFindMany(() => ({
  orderBy: [{ createdAt: 'desc' }],
  take: 50
}))

const { mutateAsync: updateNotifications } = client.notification.useUpdateMany()

const items = computed(() => notifications.value ?? [])
const unreadCount = computed(() => items.value.filter(item => !item.readAt).length)

function downloadUrl(item: Notification): string | undefined {
  return item.url ? `${apiUrl}${item.url}` : undefined
}

async function markRead(item: Notification) {
  if (item.readAt) return

  try {
    await updateNotifications({
      where: { id: item.id, readAt: null },
      data: { readAt: new Date() }
    })
    refresh()
  } catch (error) {
    handleError(error)
  }
}

async function markAllRead() {
  try {
    await updateNotifications({
      where: { readAt: null },
      data: { readAt: new Date() }
    })
    refresh()
  } catch (error) {
    handleError(error)
  }
}
</script>

<template>
  <USlideover
    title="Notifications"
    :ui="{ body: 'p-0!' }"
  >
    <template #body>
      <UPageList
        v-if="items.length"
        divide
      >
        <UPageCard
          v-for="item in items"
          :key="item.id"
          :variant="item.readAt ? 'ghost' : 'soft'"
          class="rounded-none"
          :icon="item.icon || 'i-lucide-bell'"
          :title="item.title ?? undefined"
          :description="item.body"
          :ui="{
            container: 'gap-2 py-3!',
            wrapper: 'flex-row items-start gap-2',
            title: 'text-sm font-normal',
            footer: 'pt-0 mt-0',
            description: 'text-sm text-muted line-clamp-3',
            leading: 'mb-0 mt-0.5',
            leadingIcon: 'size-4'
          }"
          @click="item.readAt ? undefined : markRead(item)"
        >
          <template #leading>
            <UBadge
              :icon="item.icon || 'i-lucide-bell'"
              :color="item.color as BadgeProps['color']"
              size="lg"
              variant="soft"
              class="p-2 rounded-full bg-muted"
              :ui="{
                leadingIcon: 'size-4'
              }"
            />
          </template>
          <div class="flex items-center justify-start ms-10 gap-1">
            <UButton
              v-if="!item.readAt"
              label="Mark as read"
              icon="i-lucide-check"
              color="neutral"
              variant="soft"
              size="sm"
              @click="markRead(item)"
            />
            <UButton
              v-if="downloadUrl(item)"
              label="Open"
              icon="i-lucide-external-link"
              color="neutral"
              variant="soft"
              size="sm"
              :to="downloadUrl(item)"
              target="_blank"
            />
          </div>
          <template #footer>
            <RelativeTimeCard
              :date="item.createdAt"
              class="text-xs text-dimmed"
              :label="useTimeAgo(item.createdAt).value"
            />
          </template>
        </UPageCard>
      </UPageList>
      <UEmpty
        v-else
        :loading="asyncStatus === 'loading'"
        icon="i-lucide-bell"
        title="No notifications"
        description="You're all caught up."
        class="h-full"
      />
    </template>

    <template
      v-if="unreadCount"
      #footer
    >
      <UButton
        :label="unreadCount ? `Mark all as read (${unreadCount})` : 'Mark all as read'"
        icon="i-lucide-check-check"
        color="neutral"
        variant="ghost"
        class="ms-auto"
        :disabled="!unreadCount"
        @click="markAllRead"
      />
    </template>
  </USlideover>
</template>
