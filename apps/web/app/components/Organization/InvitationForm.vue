<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { MemberRole } from '@repo/db/enums'

const client = useAuthClient()
const toast = useToast()

const emit = defineEmits<{
  afterInvite: []
}>()

const inviteRoles = MemberRole.filter(role => role.value !== 'owner')

const schema = z.object({
  email: z.string().trim().email('Invalid email'),
  role: z.enum(['member', 'admin'], 'Role is required')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  email: '',
  role: 'member'
})

const inviting = ref(false)

async function onSubmit(_event: FormSubmitEvent<Schema>) {
  if (!client) return
  inviting.value = true
  try {
    const { error } = await client.organization.inviteMember({
      email: state.email!.trim(),
      role: state.role!
    })
    if (error) throw new Error(error.message)

    toast.add({
      description: `Invitation sent to ${state.email!.trim()}`
    })
    state.email = ''
    emit('afterInvite')
  } catch (error) {
    handleError(error)
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <UForm
    :schema="schema"
    :state="state"
    class="space-y-5"
    @submit="onSubmit"
  >
    <UFormField
      name="email"
      label="Email address, will be invited to join your organization."
      required
    >
      <UInput
        v-model="state.email"
        type="email"
        placeholder="teammate@example.com"
      />
    </UFormField>

    <UFormField
      name="role"
      label="Role"
    >
      <USelect
        v-model="state.role"
        :items="inviteRoles"
        value-key="value"
        label-key="label"
      />
    </UFormField>

    <UButton
      type="submit"
      icon="i-lucide-send"
      label="Send Invitation"
      :loading="inviting"
      block
    />
  </UForm>
</template>
