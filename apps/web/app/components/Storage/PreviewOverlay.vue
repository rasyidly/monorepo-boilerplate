<script setup lang="ts">
import type { StorageObject } from '~/composables/useFileStorage'

const props = defineProps<{
  object: StorageObject
  downloadUrl: string
}>()

const storage = useFileStorage()

const previewUrl = ref<string>()

const isImage = computed(() => {
  const ext = basename(props.object.key).split('.').pop()?.toLowerCase()
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(ext ?? '')
})

// `<img>` doesn't send the session cookie cross-origin, so for images we fetch
// a presigned URL directly (no auth required) to render the preview.
watch(() => props.object.key, async (key) => {
  previewUrl.value = undefined
  if (isImage.value) {
    previewUrl.value = (await storage.presign({ key })).url
  }
}, { immediate: true })

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
</script>

<template>
  <USlideover
    :title="basename(object.key)"
    :ui="{ body: 'space-y-4' }"
  >
    <template #body>
      <img
        v-if="isImage && previewUrl"
        :src="previewUrl"
        :alt="basename(object.key)"
        class="max-h-72 object-contain rounded-lg border border-default"
      >
      <UEmpty
        v-else
        variant="outline"
        :icon="fileIcon(object.key)"
        title="Preview unavailable"
        description="This file cannot be displayed as a preview."
      />

      <UPageCard
        title="Metadata"
        :description="object.key"
        variant="naked"
        :ui="{ description: 'text-sm' }"
      >
        <div class="space-y-1 text-sm">
          <div class="flex items-center gap-4">
            <div class="text-muted w-40">
              Name
            </div>
            <span>{{ basename(object.key) }}</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-muted w-40">
              Size
            </div>
            <span>{{ formatBytes(object.size) }}</span>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-muted w-40">
              Modified
            </div>
            <span>{{ formatDate(object.lastModified) }}</span>
          </div>
        </div>
      </UPageCard>
    </template>
    <template #footer>
      <UButton
        label="Download"
        icon="i-lucide-download"
        :href="downloadUrl"
        target="_blank"
        block
      />
    </template>
  </USlideover>
</template>
