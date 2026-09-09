<script setup lang="ts">
import { h } from 'vue'
import type { DropdownMenuItem, SelectItem, TableColumn } from '@nuxt/ui'
import { NullContent, UBadge, UCheckbox, UInput, UTextarea, UUser, DataTableHeader } from '#components'
import { PostStatus } from '@repo/db/enums'
import type { FindManyArgs, ModelResult } from '@repo/db'
import type { SchemaType } from '@repo/db/zenstack/schema'

const { client } = useDbClient()
const toast = useToast()
const authClient = useAuthClient()

type Post = ModelResult<SchemaType, 'Post', { include: { author: true } }>
type PostArgs = FindManyArgs<SchemaType, 'Post'>

const q = useRouteFilter<{
  page: number
  limit: number
  where?: PostArgs['where']
  orderBy?: PostArgs['orderBy']
}>('q', { page: 1, limit: 50 })

const columnVisibility = ref<Record<string, boolean>>({})
const columnPinning = ref({ left: ['select'], right: [] })

const activeMemberRole = authClient?.useActiveMemberRole()
const isOwner = computed(() => activeMemberRole?.value?.data?.role === 'owner')

const { data: rows, asyncStatus, refresh } = client.post.useFindMany(() => ({
  include: { author: true },
  where: q.value.where,
  orderBy: q.value.orderBy ?? [{ createdAt: 'desc' }],
  take: q.value.limit,
  skip: (q.value.page - 1) * q.value.limit
}))
const { data: total } = client.post.useCount(() => ({ where: q.value.where }))

const { mutateAsync: deletePost } = client.post.useDelete()
const { mutateAsync: updatePost } = client.post.useUpdate()

// ── Selection ──────────────────────────────────────────────────────────────
const rowSelection = ref<Record<string, boolean>>({})

const selectedRows = computed<Post[]>(() =>
  (rows.value ?? []).filter(row => !!rowSelection.value[row.id])
)

async function deletePosts(ids: string[]) {
  const results = await Promise.allSettled(
    ids.map(id => deletePost({ where: { id } }))
  )
  const failed = results.filter(r => r.status === 'rejected').length
  if (failed) {
    toast.add({
      description: `${failed} of ${ids.length} deletions failed`
    })
  } else {
    toast.add({
      description: `${ids.length} ${ids.length === 1 ? 'post deleted' : 'posts deleted'}`
    })
  }
}

function confirmDelete(ids: string[], onDone?: () => void) {
  useConfirmation({
    title: ids.length === 1 ? 'Delete Post' : 'Delete Posts',
    description: ids.length === 1
      ? 'Are you sure you want to permanently delete this post? This action cannot be undone.'
      : `Are you sure you want to permanently delete ${ids.length} posts? This action cannot be undone.`,
    color: 'error',
    confirm: {
      label: 'Yes, delete',
      onClick: async () => {
        await deletePosts(ids)
        onDone?.()
      }
    }
  })
}

const selectionItems = computed<DropdownMenuItem[][]>(() => {
  if (!selectedRows.value.length || !isOwner.value) return []
  return [[{
    label: `Delete ${selectedRows.value.length} post(s)`,
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => confirmDelete(selectedRows.value.map(s => s.id), () => { rowSelection.value = {} })
  }]]
})

async function updateField(row: Post, field: string, value: unknown) {
  try {
    await updatePost({
      where: { id: row.id },
      data: { [field]: value === '' ? null : value }
    })
    refresh()
  } catch (error) {
    handleError(error)
  }
}

const columns: TableColumn<Post>[] = [{
  id: 'select',
  enableHiding: false,
  enableSorting: false,
  size: 40,
  header: ({ table }) => h(UCheckbox, {
    'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
    'onUpdate:modelValue': (value: unknown) => table.toggleAllPageRowsSelected(!!value),
    'aria-label': 'Select all'
  }),
  cell: ({ row }) => h(UCheckbox, {
    'modelValue': row.getIsSelected(),
    'onUpdate:modelValue': (value: unknown) => row.toggleSelected(!!value),
    'aria-label': 'Select row'
  })
}, {
  accessorKey: 'title',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Title',
    'icon': 'i-lucide-text',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}, {
  accessorKey: 'content',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Content',
    'icon': 'i-lucide-align-justify',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}, {
  id: 'author',
  accessorKey: 'author.name',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Author',
    'icon': 'i-lucide-user',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}, {
  accessorKey: 'status',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Status',
    'icon': 'i-lucide-list',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}, {
  accessorKey: 'publishedAt',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Published',
    'icon': 'i-lucide-calendar',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}, {
  accessorKey: 'createdAt',
  header: ({ column }) => h(DataTableHeader, {
    'column': column,
    'label': 'Created',
    'icon': 'i-lucide-clock',
    'modelValue': q.value.orderBy ?? [],
    'onUpdate:modelValue': (orderBy) => { q.value.orderBy = orderBy }
  })
}]

useHead({ title: 'Posts' })
</script>

<template>
  <div class="flex flex-1 overflow-hidden">
    <UDashboardPanel :ui="{ body: 'p-0!' }">
      <template #header>
        <UDashboardNavbar title="Posts">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
          <template #right>
            <UButton
              variant="ghost"
              icon="i-lucide-refresh-cw"
              :loading="asyncStatus === 'loading'"
              @click="refresh()"
            />
          </template>
        </UDashboardNavbar>
        <UDashboardToolbar>
          <UDropdownMenu
            v-if="selectedRows.length && selectionItems.length"
            :items="selectionItems"
          >
            <UButton
              variant="soft"
              icon="i-lucide-list-checks"
              :label="`${selectedRows.length} selected`"
            />
          </UDropdownMenu>
          <DataTableColumnFilterButton
            v-model="q.where"
            :model="'Post'"
            :columns="columns"
          />
          <DataTableFilterTags
            v-model="q.where"
            :model="'Post'"
            :columns="columns"
          />
          <div class="grow" />
          <DataTableColumnSortButton
            v-model="q.orderBy"
            :model="'Post'"
            :columns="columns"
          />
          <DataTableColumnVisibilityButton
            v-model="columnVisibility"
            :columns="columns"
          />
        </UDashboardToolbar>
      </template>

      <template #body>
        <UTable
          v-model:column-visibility="columnVisibility"
          v-model:column-pinning="columnPinning"
          v-model:row-selection="rowSelection"
          class="flex-1"
          :get-row-id="row => row.id"
          :columns="columns"
          :data="rows ?? []"
          :loading="asyncStatus === 'loading'"
          sticky="header"
        >
          <template #title-cell="{ row }">
            <LazyEditableContent
              v-model="row.original.title"
              :label="row.original.title"
              @submit="() => updateField(row.original, 'title', row.original.title)"
            >
              <UInput
                v-model="row.original.title"
                size="sm"
              />
            </LazyEditableContent>
          </template>
          <template #content-cell="{ row }">
            <LazyEditableContent
              v-model="row.original.content"
              :label="row.original.content"
              @submit="(value: string) => updateField(row.original, 'content', value)"
            >
              <UTextarea
                v-model="row.original.content"
                size="sm"
                :rows="3"
              />
            </LazyEditableContent>
          </template>
          <template #author-cell="{ row }">
            <LazyEditableContent
              v-model.nullable="row.original.authorId"
              :label="row.original.author?.name"
              @submit="(value: unknown) => updateField(row.original, 'authorId', value)"
            >
              <template #label="{ label }">
                <UUser
                  v-if="label"
                  :name="label"
                  size="xs"
                  :avatar="{
                    alt: label
                  }"
                  :ui="{ name: 'text-sm font-normal' }"
                />
                <NullContent v-else />
              </template>
              <LazyZenstackSelectMenu
                v-model="row.original.authorId"
                model="User"
                value-key="id"
                label-key="name"
                :search-keys="['name', 'email']"
                size="sm"
                clear
              />
            </LazyEditableContent>
          </template>
          <template #status-cell="{ row }">
            <LazyEditableContent
              v-model="row.original.status"
              :label="row.original.status"
              class="w-full justify-center"
              @submit="(value: string) => updateField(row.original, 'status', value)"
            >
              <template #label="{ label }">
                <UBadge
                  v-bind="PostStatus.find(s => s.value === label)"
                  variant="soft"
                />
              </template>
              <USelect
                v-model="row.original.status"
                :items="PostStatus as SelectItem[]"
                size="sm"
              />
            </LazyEditableContent>
          </template>
          <template #publishedAt-cell="{ row }">
            <LazyEditableContent
              v-model.nullable="row.original.publishedAt"
              :label="row.original.publishedAt?.toString()"
              @submit="(value: string) => updateField(row.original, 'publishedAt', value)"
            >
              <template #label="{ label }">
                <RelativeTimeCard
                  :date="label ? new Date(label) : null"
                  :label="formatDate(label)"
                />
              </template>
              <UInput
                :model-value="formatDate(row.original.publishedAt, 'YYYY-MM-DD')"
                type="date"
                size="sm"
                @update:model-value="(value) => updateField(row.original, 'publishedAt', value)"
              />
            </LazyEditableContent>
          </template>
          <template #createdAt-cell="{ row }">
            <RelativeTimeCard
              :date="row.original.createdAt"
              :label="formatDate(row.original.createdAt)"
            />
          </template>
        </UTable>
        <DataTablePagination
          v-model:page="q.page"
          v-model:limit="q.limit"
          :total="total ?? 0"
          class="border-t border-default"
        />
      </template>
    </UDashboardPanel>
  </div>
</template>
