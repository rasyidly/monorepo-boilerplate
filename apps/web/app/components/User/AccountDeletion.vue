<script setup lang="ts">
const client = useAuthClient()
const toast = useToast()

async function handleDelete() {
  try {
    const { error } = await client?.deleteUser({
      callbackURL: '/auth/signin'
    }) ?? {}

    if (error) throw new Error(error.message)

    toast.add({ description: 'Confirmation email sent. Check your inbox to delete your account.' })
  } catch (error) {
    handleError(error)
  }
}

function openConfirmation() {
  useConfirmation({
    color: 'error',
    icon: 'i-lucide-trash-2',
    title: 'Delete Account?',
    description: 'This will send a confirmation email to your account. Click the link in the email to complete the account deletion. All your data will be permanently removed.',
    confirm: {
      icon: 'i-lucide-triangle-alert',
      label: 'Send Deletion Confirmation',
      onClick: handleDelete
    }
  })
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted-foreground">
      Deleting your account will remove access to all organizations and related data. A confirmation email will be
      sent before your account is deleted.
    </p>

    <UButton
      color="error"
      icon="i-lucide-trash-2"
      label="Delete Account"
      variant="soft"
      @click="openConfirmation"
    />
  </div>
</template>
