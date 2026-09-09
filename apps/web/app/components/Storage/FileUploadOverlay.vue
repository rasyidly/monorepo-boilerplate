<script setup lang="ts">
const props = defineProps<{
  onUploaded?: () => void
}>()

const storage = useFileStorage()
const toast = useToast()

const files = ref<File[]>([])
const uploading = ref(false)

async function upload(close: () => void) {
  if (!files.value.length) return

  uploading.value = true
  try {
    for (const file of files.value) {
      await storage.upload(file)
    }
    toast.add({
      description: `${files.value.length} ${files.value.length === 1 ? 'file uploaded' : 'files uploaded'}`
    })
    props.onUploaded?.()
    close()
  } catch (error) {
    handleError(error)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <UModal
    title="Upload Files"
    class="max-w-xl"
  >
    <template #body>
      <UFileUpload
        v-model="files"
        label="Choose files"
        description="Maximum 5MB per file, JPG, PNG, or PDF"
        multiple
        dropzone
        layout="list"
        class="min-h-64"
        :disabled="uploading"
      />
    </template>
    <template #footer="{ close }">
      <UButton
        label="Cancel"
        color="neutral"
        variant="subtle"
        block
        @click="close"
      />
      <UButton
        label="Upload"
        icon="i-lucide-upload"
        :loading="uploading"
        :disabled="!files.length"
        block
        @click="upload(close)"
      />
    </template>
  </UModal>
</template>
