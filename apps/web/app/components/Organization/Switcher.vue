<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { LazyOrganizationCreateFormOverlay } from '#components'

const client = useAuthClient()
const overlay = useOverlay()

const activeOrganization = client?.useActiveOrganization()
const listOrganizations = client?.useListOrganizations()

const createOrganizationOverlay = overlay.create(LazyOrganizationCreateFormOverlay)

const organizations = computed(() => listOrganizations?.value.data?.map(organization => ({
  id: organization.id,
  label: organization?.name,
  avatar: {
    alt: organization?.name ?? '',
    loading: 'lazy' as const
  }
})) ?? [])

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      type: 'label',
      label: 'Active Organization',
      class: 'text-xs font-normal text-muted'
    },
    {
      type: 'label',
      label: activeOrganization?.value?.data?.name ?? 'Loading ...',
      avatar: {
        alt: activeOrganization?.value?.data?.name ?? ''
      }
    }
  ],
  organizations.value
    .filter(organization => organization.id !== activeOrganization?.value?.data?.id)
    .map(organization => ({
      ...organization,
      onSelect: async () => {
        await client?.organization.setActive({
          organizationId: organization.id
        })
      }
    })),
  [
    {
      label: 'Create new organization',
      icon: 'i-lucide-plus',
      onSelect: () => createOrganizationOverlay.open({
        onAfterCreate: () => {
          createOrganizationOverlay.close()
        }
      })
    },
    {
      label: 'Invite members',
      icon: 'i-lucide-user-plus',
      to: '/core/organization/members/invitations'
    }
  ]
].filter(a => a.length) as DropdownMenuItem[][])
</script>

<template>
  <UDropdownMenu
    :items="items"
  >
    <slot :active-organization="activeOrganization?.data" />
  </UDropdownMenu>
</template>
