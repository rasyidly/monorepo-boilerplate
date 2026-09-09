<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'
import { autoLabel, getNestedSortDir, removePath, setSortPath, type DataTableColumnInstance, type SortDirection, type SortEntry } from './index'

const props = defineProps<{
  label?: string
  icon?: string
  sortKey?: string
  column?: DataTableColumnInstance
  /** Hide the sort group and sort indicator — headers still offer pin/hide. */
  noSort?: boolean
}>()

/** Prisma orderBy: an array of single-key entries (or a single entry). */
const sortModel = defineModel<SortEntry[] | SortEntry>({ default: () => [] })

const entries = computed<SortEntry[]>(() =>
  Array.isArray(sortModel.value) ? sortModel.value : sortModel.value ? [sortModel.value] : []
)

// label / icon / sortKey derive from the column itself when not passed in:
// sortKey = accessorKey ?? column id (accessorKey keeps dotted relation paths
// like `author.name` intact); label/icon from `meta`.
const columnId = computed(() => props.column?.id)
const accessorKey = computed(() => {
  const key = props.column?.columnDef.accessorKey
  return typeof key === 'string' && key ? key : null
})
const sortKey = computed(() => props.sortKey ?? accessorKey.value ?? columnId.value)
const metaOf = computed(() => (props.column?.columnDef.meta as { label?: string, icon?: string } | undefined))
const label = computed(() => props.label ?? metaOf.value?.label ?? (columnId.value ? autoLabel(columnId.value) : ''))
const icon = computed(() => props.icon ?? metaOf.value?.icon)

const currentDir = computed<SortDirection | null>(() =>
  sortKey.value ? getNestedSortDir(entries.value, sortKey.value) : null
)

const sortIcon = computed(() => {
  if (props.noSort) return 'i-lucide-chevron-down'
  if (!currentDir.value) return 'i-lucide-chevrons-up-down'
  return currentDir.value === 'asc' ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'
})

function applySort(dir: SortDirection | null) {
  if (!sortKey.value) return
  const segments = sortKey.value.split('.')
  const base = removePath(entries.value, segments)
  sortModel.value = dir ? setSortPath(base, segments, dir) : base
}

const isPinned = computed<'left' | 'right' | null>(() => {
  const pinned = props.column?.getIsPinned()
  return pinned === 'left' || pinned === 'right' ? pinned : null
})

function togglePin(side: 'left' | 'right') {
  const column = props.column
  if (!column) return
  column.pin(column.getIsPinned() === side ? false : side)
}

function hideColumn() {
  props.column?.toggleVisibility(false)
}

const sortGroup = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Sort Ascending',
    icon: 'i-lucide-chevron-up',
    type: 'checkbox',
    checked: currentDir.value === 'asc',
    onSelect: (e: Event) => {
      e.preventDefault()
      applySort('asc')
    }
  },
  {
    label: 'Sort Descending',
    icon: 'i-lucide-chevron-down',
    type: 'checkbox',
    checked: currentDir.value === 'desc',
    onSelect: (e: Event) => {
      e.preventDefault()
      applySort('desc')
    }
  },
  ...(currentDir.value
    ? [{
        label: 'Clear Sort',
        icon: 'i-lucide-x',
        onSelect: () => applySort(null)
      }]
    : [])
])

const pinGroup = computed<DropdownMenuItem[]>(() => [
  {
    label: 'Pin Left',
    icon: 'i-lucide-panel-left',
    type: 'checkbox',
    checked: isPinned.value === 'left',
    onSelect: (e: Event) => {
      e.preventDefault()
      togglePin('left')
    }
  },
  {
    label: 'Pin Right',
    icon: 'i-lucide-panel-right',
    type: 'checkbox',
    checked: isPinned.value === 'right',
    onSelect: (e: Event) => {
      e.preventDefault()
      togglePin('right')
    }
  }
])

const items = computed<DropdownMenuItem[][]>(() => [
  ...(props.noSort ? [] : [sortGroup.value]),
  ...(props.column ? [pinGroup.value, [{ label: 'Hide Column', icon: 'i-lucide-eye-off', onSelect: hideColumn }]] : [])
])
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      :icon="icon || undefined"
      :label="label"
      :trailing-icon="sortIcon"
      variant="soft"
      color="neutral"
      size="sm"
      class="font-semibold min-w-min"
      block
    />
  </UDropdownMenu>
</template>
