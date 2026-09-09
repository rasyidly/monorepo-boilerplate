<script setup lang="ts">
import { UUser } from '#components'
import type { TableColumn } from '@nuxt/ui'
import type { Member } from 'better-auth/client'

const client = useAuthClient()

const { data: members, pending } = await useAsyncData(async () => {
  const members = await client?.organization.listMembers({
    query: {}
  })
  return members?.data?.members || []
})

const columns: TableColumn<Member & { user: { name: string } }>[] = [{
  id: 'user',
  header: 'Name',
  cell: ({ row }) => h(UUser, {
    name: row.original.user.name,
    avatar: {
      alt: row.original.user.name
    }
  })
}, {
  accessorKey: 'user.email',
  header: 'Email'
}, {
  accessorKey: 'role',
  header: 'Role'
}]

useHead({
  title: 'Posts'
})
</script>

<template>
  <div class="flex flex-1 overflow-auto">
    <UDashboardPanel
      id="core-users"
      :ui="{ body: 'p-0!' }"
    >
      <template #header>
        <UDashboardNavbar title="Users">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>
      <template #body>
        <UTable
          :columns="columns"
          :data="members"
          :loading="pending"
        />
      </template>
    </UDashboardPanel>
  </div>
</template>
