<script lang="ts" setup generic="T extends Record<string, unknown>">
import { fieldsFromColumns, orderToPairs, removePath, resolveFields, setSortPath, type DataTableColumn, type SortDirection, type SortEntry, type TableField } from './index'

const props = defineProps<{
  columns: DataTableColumn<T>[]
  /** When provided, filter/sort fields are resolved from the ZenStack schema instead of `meta`. */
  model?: string
}>()

/** Prisma orderBy: an array of single-key entries (or a single entry). */
const sortModel = defineModel<SortEntry[] | SortEntry>({ default: () => [] })

const entries = computed<SortEntry[]>(() =>
  Array.isArray(sortModel.value) ? sortModel.value : sortModel.value ? [sortModel.value] : []
)

const fields = computed<TableField[]>(() =>
  props.model
    ? resolveFields({ model: props.model, columns: props.columns, filterSource: 'columns' })
    : fieldsFromColumns(props.columns)
)

const sortFieldItems = computed(() => fields.value.map(f => ({ label: f.label, value: f.name })))

const sortEntries = computed(() => orderToPairs(entries.value))

const availableFields = computed(() =>
  fields.value.filter(f => !sortEntries.value.some(s => s.field === f.name))
)

const activeCount = computed(() => sortEntries.value.length)

function toggle(field: string, dir: SortDirection) {
  const segments = field.split('.')
  const base = removePath(entries.value, segments)
  sortModel.value = setSortPath(base, segments, dir)
}

function clearField(field: string) {
  sortModel.value = removePath(entries.value, field.split('.'))
}

function updateField(oldField: string, newField: string) {
  const entry = sortEntries.value.find(e => e.field === oldField)
  if (!entry) return
  const base = removePath(entries.value, oldField.split('.'))
  sortModel.value = setSortPath(base, newField.split('.'), entry.direction)
}

function addSort() {
  if (!availableFields.value.length) return
  toggle(availableFields.value[0]!.name, 'asc')
}

function clearAll() {
  sortModel.value = {}
}
</script>

<template>
  <UPopover :ui="{ content: 'max-w-sm p-0 divide-y divide-default [&>div]:p-1.5 [&>div]:flex [&>div]:gap-2' }">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-arrow-up-down"
      square
      :ui="{ leadingIcon: 'sm:text-dimmed', label: 'max-sm:hidden' }"
      label="Sort"
    >
      <template #leading>
        <UChip
          :show="activeCount > 0"
        >
          <UIcon
            name="i-lucide-arrow-up-down"
            class="size-5 sm:text-dimmed"
          />
        </UChip>
      </template>
    </UButton>
    <template #content>
      <div class="flex-col">
        <UAlert
          v-if="!sortEntries.length"
          icon="i-lucide-arrow-up-down"
          title="No sorting applied"
          description="Add a sort field to order results"
          variant="soft"
          color="neutral"
        />
        <div
          v-else
          class="flex flex-col gap-2"
        >
          <div
            v-for="(entry) in sortEntries"
            :key="entry.field"
            class="flex items-center gap-1.5 bg-elevated/50 rounded-lg px-2.5 py-2"
          >
            <USelect
              :model-value="entry.field"
              :items="sortFieldItems.filter(f => f.value === entry.field || !sortEntries.some(s => s.field === f.value))"
              size="sm"
              class="flex-1 min-w-0"
              @update:model-value="(v: string) => updateField(entry.field, v)"
            />
            <UButton
              :icon="entry.direction === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'"
              :label="entry.direction === 'asc' ? 'Ascending' : 'Descending'"
              variant="soft"
              color="neutral"
              size="sm"
              @click="toggle(entry.field, entry.direction === 'asc' ? 'desc' : 'asc')"
            />
            <UButton
              icon="i-lucide-x"
              :aria-label="`Remove sort on ${entry.field}`"
              variant="ghost"
              color="neutral"
              size="sm"
              square
              @click="clearField(entry.field)"
            />
          </div>
        </div>
      </div>
      <div>
        <UButton
          icon="i-lucide-plus"
          label="Add sort"
          variant="soft"
          color="neutral"
          size="sm"
          :disabled="!availableFields.length"
          @click="addSort"
        />
        <div class="flex-1" />
        <UButton
          v-if="sortEntries.length"
          label="Clear all"
          variant="ghost"
          color="error"
          size="sm"
          icon="i-lucide-trash-2"
          @click="clearAll"
        />
      </div>
    </template>
  </UPopover>
</template>
