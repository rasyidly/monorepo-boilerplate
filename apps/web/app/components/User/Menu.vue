<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const client = useAuthClient()

const { user, signOut } = useUserSession()
const listOrganizations = client?.useListOrganizations()

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
      label: user.value?.name,
      description: user.value?.email,
      avatar: {
        alt: user.value?.name
      },
      type: 'label'
    }
  ],
  [
    {
      label: 'My Account',
      icon: 'i-lucide-user',
      to: '/account'
    },
    {
      label: 'Billing',
      icon: 'i-lucide-credit-card',
      disabled: true
    },
    {
      label: 'Settings',
      icon: 'i-lucide-cog',
      disabled: true
    },
    {
      label: 'Keyboard shortcuts',
      icon: 'i-lucide-monitor',
      disabled: true
    }
  ],
  [
    {
      label: 'Organizations',
      icon: 'i-lucide-users',
      filter: {
        placeholder: 'Search organization...'
      },
      children: [
        organizations.value
      ]
    },
    {
      label: 'New team',
      icon: 'i-lucide-plus',
      kbds: ['shift', 'n'],
      disabled: true
    }
  ],
  [
    {
      label: 'Logout',
      icon: 'i-lucide-log-out',
      color: 'error',
      kbds: ['shift', 'q'],
      onSelect: () => signOut({
        onSuccess: () => {
          navigateTo('/auth/signin')
        }
      })
    }
  ]
])

defineShortcuts(extractShortcuts(items.value))
</script>

<template>
  <UDropdownMenu
    :items="items"
    :ui="{ content: 'w-2xs' }"
  >
    <slot />
  </UDropdownMenu>
</template>
