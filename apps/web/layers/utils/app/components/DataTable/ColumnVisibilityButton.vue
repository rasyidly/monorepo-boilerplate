<script lang="ts" setup generic="T extends Record<string, unknown>">
import type { DropdownMenuItem } from '@nuxt/ui'
import { autoLabel, type DataTableColumn } from './index'

const props = defineProps<{
  columns: DataTableColumn<T>[]
}>()

const visibility = defineModel<Record<string, boolean>>({ default: () => ({}) })

const columnId = (col: DataTableColumn<T>): string | null => {
  if ('id' in col && typeof col.id === 'string') return col.id
  const accessorKey = (col as { accessorKey?: unknown }).accessorKey
  return typeof accessorKey === 'string' && accessorKey ? accessorKey : null
}

const columnLabel = (col: DataTableColumn<T>): string => {
  const id = columnId(col) ?? ''
  return col.meta?.label ?? autoLabel(id)
}

const columnItems = computed<DropdownMenuItem[]>(() =>
  props.columns
    .filter(col => col.enableHiding !== false && columnId(col) !== null)
    .map((col): DropdownMenuItem => {
      const id = columnId(col)!
      return {
        label: columnLabel(col),
        type: 'checkbox',
        checked: id in visibility.value ? visibility.value[id]! : true,
        onUpdateChecked: (checked: boolean) => {
          visibility.value = { ...visibility.value, [id]: !!checked }
        },
        onSelect: (e: Event) => {
          e.preventDefault()
        }
      }
    })
)
</script>

<template>
  <UDropdownMenu
    :items="columnItems"
    :content="{ align: 'end' }"
  >
    <UButton
      label="Column"
      color="neutral"
      variant="ghost"
      icon="i-lucide-columns-2"
      square
      :ui="{ leadingIcon: 'sm:text-dimmed', label: 'max-sm:hidden' }"
    />
  </UDropdownMenu>
</template>
