<script setup lang="ts">
import { h } from 'vue'
import type { DropdownMenuItem, SelectItem, TableColumn } from '@nuxt/ui'
import { DataTableHeader } from '#components'
import { MemberRole } from '@repo/db/enums'

useHead({
  title: 'Members'
})

const client = useAuthClient()
const toast = useToast()

const activeOrganization = client?.useActiveOrganization()
const activeMember = client?.useActiveMember()
const activeMemberRole = client?.useActiveMemberRole()

const organizationId = computed(() => activeOrganization?.value.data?.id ?? null)
const currentRole = computed(() => activeMemberRole?.value.data?.role ?? null)
const currentMemberId = computed(() => activeMember?.value.data?.id ?? null)

const canManage = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin')

type OrgMember = typeof client extends null | undefined ? never : NonNullable<typeof client>['$Infer']['Member']

const q = useRouteFilter<{
  page: number
  limit: number
  role?: string
}>('q', { page: 1, limit: 50 })

const offset = computed(() => (q.value.page - 1) * q.value.limit)

const { data: members, status, refresh } = await useAsyncData('organization-members', async () => {
  if (!organizationId.value || !client) return { members: [], total: 0 }

  try {
    const { data, error } = await client.organization.listMembers({
      query: {
        organizationId: organizationId.value,
        limit: q.value.limit,
        offset: offset.value,
        filterField: q.value.role ? 'role' : undefined,
        filterValue: q.value.role ?? undefined,
        filterOperator: q.value.role ? 'eq' : undefined
      }
    })
    if (error) throw new Error(error.message)

    return {
      members: (data?.members ?? []).map(member => ({
        ...member,
        createdAt: new Date(member.createdAt)
      })),
      total: data?.total ?? 0
    }
  } catch (error) {
    handleError(error)
    throw error
  }
}, {
  watch: [organizationId, q]
})

const rows = computed<OrgMember[]>(() => members.value?.members ?? [])
const total = computed(() => members.value?.total ?? 0)
const loading = computed(() => status.value === 'pending')

watch(() => q.value.role, () => {
  q.value.page = 1
})

watch(() => organizationId.value, () => {
  q.value.page = 1
})

const isSelf = (member: OrgMember) => member.id === currentMemberId.value

async function changeRole(member: OrgMember, role: string) {
  if (!client) return
  try {
    const { error } = await client.organization.updateMemberRole({
      memberId: member.id,
      role
    })
    if (error) throw new Error(error.message)

    toast.add({ description: `${member.user.name}'s role changed to ${role}` })
    await refresh()
  } catch (error) {
    handleError(error)
  }
}

async function removeMember(member: OrgMember) {
  if (!client) return
  try {
    useConfirmation({
      color: 'error',
      icon: 'i-lucide-user-x',
      title: 'Remove member?',
      description: `${member.user.name} (${member.user.email}) will immediately lose access to this organization and all of its data.`,
      confirm: {
        label: 'Remove member',
        onClick: async () => {
          const { error } = await client.organization.removeMember({
            memberIdOrEmail: member.id
          })
          if (error) throw new Error(error.message)

          toast.add({ description: `${member.user.name} removed from the organization` })
          await refresh()
        }
      }
    })
  } catch (error) {
    handleError(error)
  }
}

function memberActions(member: OrgMember): DropdownMenuItem[][] {
  return [[{
    label: 'Remove member',
    icon: 'i-lucide-user-x',
    color: 'error',
    onSelect: () => removeMember(member)
  }]]
}

const columns: TableColumn<OrgMember>[] = [{
  id: 'user',
  accessorKey: 'user.name',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Name',
    icon: 'i-lucide-user',
    noSort: true
  })
}, {
  id: 'email',
  accessorKey: 'user.email',
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
  accessorKey: 'createdAt',
  header: ({ column }) => h(DataTableHeader, {
    column,
    label: 'Joined',
    icon: 'i-lucide-calendar',
    noSort: true
  })
}, {
  id: 'actions',
  enableHiding: false,
  header: '',
  cell: () => ''
}]
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <Teleport to="#organization-members_right">
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
      description="Create or switch to an organization to view its members."
      class="flex-1"
    />

    <UTable
      v-else
      class="flex-1"
      :columns="columns"
      :data="rows"
      :loading="loading"
      sticky="header"
    >
      <template #user-cell="{ row }">
        <UUser
          :name="row.original.user.name"
          :description="row.original.user.email"
          :avatar="{
            src: row.original.user.image ?? undefined,
            alt: row.original.user.name
          }"
          size="sm"
        />
      </template>
      <template #role-cell="{ row }">
        <LazyEditableContent
          v-model="row.original.role"
          :label="row.original.role"
          @submit="(value: string) => changeRole(row.original, value)"
        >
          <template #label="{ label }">
            <UBadge
              v-bind="MemberRole.find(r => r.value === String(label ?? '')) ?? { label: String(label ?? ''), value: String(label ?? ''), color: 'neutral' as const }"
              variant="soft"
            />
          </template>
          <USelect
            v-model="row.original.role"
            :items="MemberRole as SelectItem[]"
            size="sm"
          />
        </LazyEditableContent>
      </template>
      <template #createdAt-cell="{ row }">
        <RelativeTimeCard
          :date="row.original.createdAt"
          :label="formatDate(row.original.createdAt)"
        />
      </template>
      <template #actions-cell="{ row }">
        <UDropdownMenu
          v-if="canManage && !isSelf(row.original)"
          :items="memberActions(row.original)"
        >
          <UButton
            icon="i-lucide-more-horizontal"
            variant="ghost"
            color="neutral"
            square
            aria-label="Member actions"
          />
        </UDropdownMenu>
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
