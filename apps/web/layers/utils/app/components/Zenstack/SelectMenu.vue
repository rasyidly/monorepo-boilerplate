<script setup lang="ts" generic="M extends ZenstackModelName, VK extends keyof ZenstackRow<M> | undefined = undefined">
import type { Ref } from 'vue'
import type { ZenstackModelName, ZenstackRow, ZenstackWhere } from './types'

type Row = ZenstackRow<M>
/**
 * `value-key` defined → v-model carries that key's value (scalar, e.g. `id`);
 * omitted → v-model carries the whole selected row object (like USelect).
 */
type SelectValue = VK extends keyof Row ? Row[VK] : Row

const props = withDefaults(defineProps<{
  /** ZenStack model to query options from, e.g. `'User'`. */
  model: M
  /** Key to use as the value; defaults to no value-key (object mode). Usually `'id'`. */
  valueKey?: VK
  /** Field displayed as the option label. */
  labelKey?: string
  /** Extra fields the search input filters by (label is always included). */
  searchKeys?: string[]
  /** Extra filter applied to the find-many query. */
  where?: ZenstackWhere<M>
  take?: number
  searchInput?: boolean
  clear?: boolean
  placeholder?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}>(), {
  labelKey: 'name',
  take: 10,
  searchInput: true,
  clear: false,
  size: 'sm'
})

const value = defineModel<SelectValue | null>()

const { client } = useDbClient()

// The hooks client is keyed by lower-case-first model names (e.g. `user`, `post`),
// so `User` maps to `client.user`; access it through a typed cast.
function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1)
}

type QueryResult = {
  data: Ref<unknown[] | undefined>
  asyncStatus: Ref<string>
}

type ModelQueries = {
  useFindMany: (args: () => unknown) => QueryResult
  useFindFirst: (args: () => unknown) => QueryResult
}

const modelClient = (client as unknown as Record<string, ModelQueries>)[lowerFirst(props.model)]!

// ── Remote search: type → debounce → query the database ───────────────────
const searchTerm = ref('')
const debouncedTerm = refDebounced(searchTerm, 300)

const where = computed<ZenstackWhere<M> | undefined>(() => {
  const term = debouncedTerm.value.trim()
  const base = props.where
  if (!term) return base
  const fields = [props.labelKey, ...(props.searchKeys ?? [])]
  return {
    ...(base ?? {}),
    OR: fields.map(field => ({ [field]: { contains: term, mode: 'insensitive' } }))
  } as ZenstackWhere<M>
})

const { data: rows, asyncStatus } = modelClient.useFindMany(() => ({
  where: where.value,
  take: props.take
}))

// Always keep the selected row among the options so its label is preserved
// while searching (it may drop out of the DB results).
const { data: selected } = modelClient.useFindFirst(() => ({
  where: props.valueKey && value.value != null
    ? ({ [props.valueKey]: value.value } as Record<string, unknown>)
    : { id: '__none__' }
}))

const items = computed<Row[]>(() => {
  const list = (rows.value ?? []) as Row[]
  let selectedRow: Row | null = null
  if (props.valueKey) {
    selectedRow = (selected.value ?? null) as Row | null
  } else if (value.value && typeof value.value === 'object') {
    selectedRow = value.value as Row
  }
  if (!selectedRow) return list
  const sel = selectedRow
  const key = props.valueKey
  const duplicated = key
    ? list.some(row => row[key] === sel[key])
    : list.includes(sel)
  return duplicated ? list : [sel, ...list]
})

const loading = computed(() => asyncStatus.value === 'loading')
</script>

<template>
  <USelectMenu
    v-model:search-term="searchTerm"
    :model-value="value as never"
    :items="items"
    :value-key="props.valueKey as never"
    :label-key="props.labelKey as never"
    :search-input="props.searchInput"
    ignore-filter
    :loading="loading"
    :clear="props.clear"
    :placeholder="props.placeholder"
    :size="props.size"
    @update:model-value="(v: unknown) => (value = v as SelectValue | null)"
  >
    <!-- passthrough: item-label / item-description / default etc. -->
    <template
      v-for="(_, name) in $slots"
      :key="name"
      #[name]="slotProps"
    >
      <slot
        :name="name"
        v-bind="slotProps"
      />
    </template>
  </USelectMenu>
</template>
