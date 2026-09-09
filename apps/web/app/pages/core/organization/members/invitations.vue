<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import { DataTableHeader } from '#components'
import { InvitationStatus, MemberRole } from '@repo/db/enums'

useHead({
  title: 'Invitations'
})

const client = useAuthClient()
const toast = useToast()

const activeOrganization = client?.useActiveOrganization()
const activeMemberRole = client?.useActiveMemberRole()

const organizationId = computed(() => activeOrganization?.value.data?.id ?? null)
const currentRole = computed(() => activeMemberRole?.value.data?.role ?? null)

const canManage = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin')

type OrgInvitation = typeof client extends null | undefined ? never : NonNullable<typeof client>['$Infer']['Invitation']

const q = useRouteFilter<{
  page: number
  limit: number
}>('q', { page: 1, limit: 50 })

const { data: invitations, status, refresh } = await useAsyncData('organization-invitations', async () => {
  if (!organizationId.value || !client) return []

  try {
    const { data, error } = await client.organization.listInvitations({
      query: { organizationId: organizationId.value }
    })
    if (error) throw new Error(error.message)

    return (data ?? []).map(invitation => ({
      ...invitation,
      createdAt: new Date(invitation.createdAt),
      expiresAt: new Date(invitation.expiresAt)
    }))
  } catch (error) {
    handleError(error)
    throw error
  }
}, {
  watch: [organizationId, q]
})

const rows = computed<OrgInvitation[]>(() => invitations.value ?? [])
const loading = computed(() => status.value === 'pending')

const total = computed(() => rows.value.length)

const paged = computed(() => {
  const start = (q.value.page - 1) * q.value.limit
  return rows.value.slice(start, start + q.value.limit)
})

watch(() => organizationId.value, () => {
  q.value.page = 1
})

async function cancelInvitation(invitation: OrgInvitation) {
  if (!client) return
  useConfirmation({
    color: 'error',
    icon: 'i-lucide-mail-x',
    title: 'Cancel invitation?',
    description: `${invitation.email} will no longer be able to join using this invitation.`,
    confirm: {
      label: 'Cancel invitation',
      onClick: async () => {
        try {
          const { error } = await client.organization.cancelInvitation({
            invitationId: invitation.id
          })
          if (error) throw new Error(error.message)

          toast.add({ description: `Invitation to ${invitation.email} cancelled` })
          await refresh()
        } catch (error) {
          handleError(error)
        }
      }
    }
  })
}

const columns: TableColumn<OrgInvitation>[] = [{
  accessorKey: 'email',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Email',
    icon: 'i-lucide-mail',
    noSort: true
  })
}, {
  accessorKey: 'role',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Role',
    icon: 'i-lucide-shield',
    noSort: true
  })
}, {
  accessorKey: 'status',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Status',
    icon: 'i-lucide-list',
    noSort: true
  })
}, {
  accessorKey: 'createdAt',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Invited',
    icon: 'i-lucide-clock',
    noSort: true
  })
}, {
  accessorKey: 'expiresAt',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Expires',
    icon: 'i-lucide-calendar',
    noSort: true
  })
}, {
  id: 'actions',
  enableHiding: false,
  header: '',
  meta: { class: { td: 'text-end' } }
}]
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <Teleport to="#organization-members_right">
      <UModal
        title="Invite a member"
        description="Send an invitation so teammates can join your organization."
      >
        <UButton
          icon="i-lucide-user-plus"
          label="Invite"
          :disabled="!canManage || !organizationId"
        />
        <template #body="{ close }">
          <OrganizationInvitationForm
            @after-invite="() => {
              refresh()
              close()
            }"
          />
        </template>
      </UModal>
      <UButton
        variant="ghost"
        icon="i-lucide-refresh-cw"
        loading-auto
        :disabled="!organizationId"
        @click="() => refresh()"
      />
    </Teleport>

    <UEmpty
      v-if="!organizationId"
      icon="i-lucide-building-2"
      title="No active organization"
      description="Create or switch to an organization to manage invitations."
      class="flex-1"
    />

    <UTable
      v-else
      class="flex-1"
      :columns="columns"
      :data="paged"
      :loading="loading"
      sticky="header"
    >
      <template #email-cell="{ row }">
        <span class="truncate">{{ row.original.email }}</span>
      </template>
      <template #role-cell="{ row }">
        <UBadge
          v-bind="MemberRole.find(r => r.value === row.original.role) ?? { label: row.original.role, value: row.original.role, color: 'neutral' as const }"
          variant="soft"
        />
      </template>
      <template #status-cell="{ row }">
        <UBadge
          v-bind="InvitationStatus.find(s => s.value === row.original.status) ?? { label: row.original.status, value: row.original.status, color: 'neutral' as const }"
          variant="soft"
        />
      </template>
      <template #createdAt-cell="{ row }">
        <RelativeTimeCard
          :date="row.original.createdAt"
          :label="formatDate(row.original.createdAt)"
        />
      </template>
      <template #expiresAt-cell="{ row }">
        <RelativeTimeCard
          :date="row.original.expiresAt"
          :label="formatDate(row.original.expiresAt)"
        />
      </template>
      <template #actions-cell="{ row }">
        <UButton
          v-if="canManage && row.original.status === 'pending'"
          variant="ghost"
          color="error"
          icon="i-lucide-trash"
          size="sm"
          loading-auto
          label="Cancel"
          @click="cancelInvitation(row.original)"
        />
      </template>
    </UTable>

    <DataTablePagination
      v-model:page="q.page"
      v-model:limit="q.limit"
      :total="total"
      class="border-t border-default"
    />
  </div>
</template>
