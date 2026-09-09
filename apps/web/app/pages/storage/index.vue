<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { DataTableHeader, LazyStorageFileUploadOverlay, LazyStoragePreviewOverlay } from '#components'
import type { StorageObject, StorageListResult } from '~/composables/useFileStorage'

useHead({ title: 'Storage' })

const { public: { apiUrl: baseURL } } = useRuntimeConfig()
const { user } = useUserSession()
const storage = useFileStorage()
const toast = useToast()
const overlay = useOverlay()

const search = ref('')

/** List only the current user's files (`{userId}/...`). */
const prefix = computed(() => (user.value?.id ? `${user.value.id}/` : undefined))

const { data, pending, refresh } = useFetch<StorageListResult>('/storage/list', {
  baseURL,
  credentials: 'include',
  query: { prefix },
  immediate: false
})

// Fetch only once the session has resolved and we know the user's prefix.
watch(prefix, (value) => {
  if (value) refresh()
}, { immediate: true })

const objects = computed(() => data.value?.contents ?? [])

const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return objects.value
  return objects.value.filter(o => basename(o.key).toLowerCase().includes(q))
})

const fileUploadOverlay = overlay.create(LazyStorageFileUploadOverlay)
const previewOverlay = overlay.create(LazyStoragePreviewOverlay)

function openUpload() {
  fileUploadOverlay.open({ onUploaded: () => refresh() })
}

function openPreview(object: StorageObject) {
  previewOverlay.open({ object, downloadUrl: storage.downloadUrl(object.key) })
}

function basename(key: string): string {
  return key.split('/').filter(Boolean).pop() ?? key
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n >= 10 || i === 0 ? n.toFixed(0) : n.toFixed(1)} ${units[i]}`
}

function fileIcon(key: string): string {
  const ext = basename(key).toLowerCase().split('.').pop()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext ?? '')) return 'i-lucide-image'
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext ?? '')) return 'i-lucide-film'
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext ?? '')) return 'i-lucide-music'
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext ?? '')) return 'i-lucide-file-archive'
  if (['pdf'].includes(ext ?? '')) return 'i-lucide-file-text'
  return 'i-lucide-file'
}

function confirmDelete(key: string) {
  useConfirmation({
    color: 'error',
    icon: 'i-lucide-trash-2',
    title: 'Delete file?',
    description: `"${basename(key)}" will be permanently deleted.`,
    confirm: {
      label: 'Delete',
      onClick: async () => {
        try {
          await storage.remove(key)
          toast.add({
            description: 'File deleted'
          })
          await refresh()
        } catch (error) {
          handleError(error)
        }
      }
    }
  })
}

const columns: TableColumn<StorageObject>[] = [{
  accessorKey: 'key',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Name',
    icon: 'i-lucide-file',
    noSort: true
  })
}, {
  accessorKey: 'size',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Size',
    icon: 'i-lucide-hard-drive',
    noSort: true
  })
}, {
  accessorKey: 'lastModified',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Modified',
    icon: 'i-lucide-clock',
    noSort: true
  })
}, {
  id: 'actions',
  enableHiding: false,
  header: '',
  cell: () => '',
  meta: { class: { td: 'text-right' } }
}]
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <UDashboardPanel
      id="storage-index"
      :ui="{ body: 'p-0!' }"
    >
      <template #header>
        <UDashboardNavbar title="Files">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <UButton
              variant="ghost"
              icon="i-lucide-refresh-cw"
              :loading="pending"
              aria-label="Reload"
              @click="() => refresh()"
            />
            <UButton
              icon="i-lucide-upload"
              label="Upload"
              @click="openUpload"
            />
          </template>
        </UDashboardNavbar>

        <UDashboardToolbar>
          <UInput
            v-model="search"
            placeholder="Search files..."
            leading
            icon="i-lucide-search"
            clear
          />
        </UDashboardToolbar>
      </template>

      <template #body>
        <UTable
          :columns="columns"
          :data="visible"
          :loading="pending"
          sticky="header"
          class="flex-1"
        >
          <template #key-cell="{ row }">
            <UButton
              variant="link"
              class="min-w-0 justify-start"
              :aria-label="`Preview ${basename(row.original.key)}`"
              @click="openPreview(row.original)"
            >
              <div class="flex min-w-0 items-center gap-2">
                <UIcon
                  :name="fileIcon(row.original.key)"
                  class="size-4 shrink-0 text-muted"
                />
                <span class="truncate font-medium">{{ basename(row.original.key) }}</span>
              </div>
            </UButton>
          </template>
          <template #size-cell="{ row }">
            {{ formatBytes(row.original.size) }}
          </template>
          <template #lastModified-cell="{ row }">
            <RelativeTimeCard
              :date="row.original.lastModified ? new Date(row.original.lastModified) : null"
              :label="formatDate(row.original.lastModified)"
            />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UButton
                icon="i-lucide-eye"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Preview"
                @click="openPreview(row.original)"
              />
              <UButton
                icon="i-lucide-download"
                color="neutral"
                variant="ghost"
                size="sm"
                aria-label="Download"
                :href="storage.downloadUrl(row.original.key)"
                target="_blank"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                aria-label="Delete"
                @click="confirmDelete(row.original.key)"
              />
            </div>
          </template>
          <template #empty>
            <UEmpty
              icon="i-lucide-folder-open"
              title="No files yet"
              description="Upload your first file using the Upload button."
            />
          </template>
        </UTable>
      </template>
    </UDashboardPanel>
  </div>
</template>
