<script lang="ts" setup generic="T extends Record<string, unknown>">
import {
  autoLabel, buildFilterCondition, buildNested, fieldsFromColumns, FILTER_OPERATORS, filterNeedsNoInput, filterOperatorsFor,
  resolveFields, type DataTableColumn, type TableField
} from './index'

interface FilterTag {
  /** Dotted field path in the where shape, e.g. `author.name`. */
  path: string
  /** Resolved field info (type/enum) driving operators and value input. */
  field: TableField
  /** Prisma operator key, e.g. `contains`, `isNull`. */
  operator: string
  /** Editable serialized value; `''` for isNull/isNotNull. */
  value: string | string[]
  /** Last committed where fragment; kept while an edit is incomplete. */
  rawCondition: Record<string, unknown>
}

const props = defineProps<{
  columns: DataTableColumn<T>[]
  /** When provided, fields are resolved from the ZenStack schema instead of `meta`. */
  model?: string
}>()

const filterModel = defineModel<Record<string, unknown>>({ default: () => ({}) })

const fields = computed<TableField[]>(() =>
  props.model
    ? resolveFields({ model: props.model, columns: props.columns, filterSource: 'columns' })
    : fieldsFromColumns(props.columns)
)

const fieldOf = (path: string): TableField =>
  fields.value.find(f => f.name === path)
  ?? { name: path, label: autoLabel(path.replace(/\./g, ' ')), type: 'String', optional: true, isEnum: false }

const OPERATOR_KEYS = new Set(Object.values(FILTER_OPERATORS).flat().map(o => o.value))

// Column labels win (user-facing headers); fall back to an auto-label on the dotted path.
const columnLabelMap = computed(() => {
  const map = new Map<string, string>()
  for (const col of props.columns) {
    const accessorKey = (col as { accessorKey?: unknown }).accessorKey
    if (typeof accessorKey === 'string' && accessorKey && col.meta?.label) {
      map.set(accessorKey, col.meta.label)
    }
  }
  return map
})

function labelOf(dotPath: string): string {
  return columnLabelMap.value.get(dotPath)
    ?? dotPath.split('.').map(autoLabel).join(' · ')
}

/** Serialize a model value into a form-editable string (date-only for DateTime inputs). */
function serializeValue(field: TableField, val: unknown): string | string[] {
  if (Array.isArray(val)) return val.map(v => String(v))
  if (field.type === 'DateTime' && val instanceof Date) return formatDate(val, 'YYYY-MM-DD') ?? String(val)
  return String(val)
}

/** A leaf condition object's keys are operators (or 'mode'); a nested relation's keys are field names. */
function isOperatorObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).some(k => OPERATOR_KEYS.has(k) || k === 'not' || k === 'mode')
}

function parseTags(filter: Record<string, unknown>): FilterTag[] {
  const tags: FilterTag[] = []

  const walk = (node: Record<string, unknown>, prefix = '') => {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'AND' || key === 'OR') {
        for (const condition of value as Record<string, unknown>[]) walk(condition, prefix)
        continue
      }

      const path = prefix ? `${prefix}.${key}` : key
      const field = fieldOf(path)
      const rawCondition = buildNested(path, value)

      if (value === null) {
        tags.push({ path, field, operator: 'isNull', value: '', rawCondition })
        continue
      }
      if (typeof value !== 'object') continue

      const obj = value as Record<string, unknown>

      if (!isOperatorObject(obj)) {
        walk(obj, path)
        continue
      }

      if (obj.not === null) {
        tags.push({ path, field, operator: 'isNotNull', value: '', rawCondition })
      } else if (obj.not && typeof obj.not === 'object') {
        const inner = obj.not as Record<string, unknown>
        tags.push({ path, field, operator: 'not', value: serializeValue(field, inner.equals), rawCondition })
      } else {
        for (const [op, val] of Object.entries(obj)) {
          if (op === 'mode' || op === 'not') continue
          tags.push({ path, field, operator: op, value: serializeValue(field, val), rawCondition })
        }
      }
    }
  }

  walk(filter)
  return tags
}

/**
 * Local editor state. Live edits mutate these objects directly (reactive), so the
 * UI never snaps back mid-edit; the model is only synced by the debounced commit.
 */
const tags = ref<FilterTag[]>([])

/**
 * Serialized model last applied by us (own writes) or seen from outside. Reparse
 * only when it differs, so in-flight edits on `tags` are never clobbered by our
 * own debounced writes.
 */
let lastWritten = ''

const topConnector = computed(() => {
  const f = filterModel.value ?? {}
  return 'OR' in f ? 'OR' as const : 'AND' as const
})

function getEnumItems(f: TableField) {
  return f.enumItems?.length ? f.enumItems : (f.enumValues?.map(v => ({ label: v, value: v })) ?? [])
}

const isEnumMulti = (op: string) => op === 'in' || op === 'notIn'

const defaultTagValue = (f: TableField, op: string): string | string[] => {
  if (f.type === 'Boolean') return 'true'
  if (f.isEnum && f.enumItems?.length) return isEnumMulti(op) ? [] : f.enumItems[0]!.value
  if (f.type === 'Float' || f.type === 'Int') return '0'
  return ''
}

/** Rebuild the model from the current tags; incomplete tags keep their last committed fragment. */
const syncModel = useDebounceFn(() => {
  let dropped = false
  const conditions: Record<string, unknown>[] = []
  for (const tag of tags.value) {
    if (filterNeedsNoInput(tag.operator) && !tag.field.optional) {
      dropped = true // null-check on a required field is invalid in Prisma
      continue
    }
    const leaf = buildFilterCondition(tag.field, tag.operator, tag.value)
    if (leaf === null && tag.operator !== 'isNull') {
      if (tag.rawCondition) conditions.push(tag.rawCondition)
      continue
    }
    tag.rawCondition = buildNested(tag.path, leaf)
    conditions.push(tag.rawCondition)
  }

  const next: Record<string, unknown> = conditions.length === 0
    ? {}
    : conditions.length === 1
      ? conditions[0]!
      : { [topConnector.value]: conditions }

  const serialized = JSON.stringify(next)
  if (serialized === lastWritten) return
  lastWritten = serialized
  filterModel.value = next
  if (dropped) tags.value = parseTags(next) // heal stale invalid conditions from the UI too
}, 300)

function onOperatorChange(tag: FilterTag, op: string) {
  tag.operator = op
  tag.value = filterNeedsNoInput(op) ? '' : defaultTagValue(tag.field, op)
  syncModel()
}

function onValueChange(tag: FilterTag, value: string | string[]) {
  tag.value = value
  syncModel()
}

function removeTag(index: number) {
  tags.value.splice(index, 1)
  syncModel()
}

// Keep the editor in sync with external model changes (e.g. ColumnFilterButton),
// and heal stale invalid conditions (null-check on required fields) on load.
watch(filterModel, (model) => {
  const serialized = JSON.stringify(model ?? {})
  if (serialized === lastWritten) return
  lastWritten = serialized
  const parsed = parseTags(model ?? {})
  tags.value = parsed
  if (parsed.some(t => filterNeedsNoInput(t.operator) && !t.field.optional)) syncModel()
}, { immediate: true, deep: true })
</script>

<template>
  <UFieldGroup
    v-for="(tag, index) in tags"
    :key="index"
    class="min-w-min"
  >
    <UButton
      :label="labelOf(tag.path)"
      variant="subtle"
      disabled
    />
    <USelect
      :model-value="tag.operator"
      :items="filterOperatorsFor(tag.field)"
      class="w-fit"
      @update:model-value="(op: string) => onOperatorChange(tag, op)"
    />
    <template v-if="!filterNeedsNoInput(tag.operator)">
      <USelectMenu
        v-if="tag.field.isEnum"
        :model-value="tag.value as never"
        :items="getEnumItems(tag.field)"
        :multiple="isEnumMulti(tag.operator)"
        @update:model-value="(v: unknown) => onValueChange(tag, v as string | string[])"
      />
      <USelect
        v-else-if="tag.field.type === 'Boolean'"
        :model-value="String(tag.value)"
        :items="[{ label: 'True', value: 'true' }, { label: 'False', value: 'false' }]"
        @update:model-value="(v: string) => onValueChange(tag, v)"
      />
      <UInputNumber
        v-else-if="tag.field.type === 'Int' || tag.field.type === 'Float'"
        :model-value="Number(tag.value)"
        class="min-w-24"
        @update:model-value="(v: number) => onValueChange(tag, String(v))"
      />
      <UInput
        v-else-if="tag.field.type === 'DateTime'"
        :model-value="String(tag.value)"
        type="date"
        class="min-w-24"
        @update:model-value="(v: string) => onValueChange(tag, v)"
      />
      <UInput
        v-else
        :model-value="String(tag.value)"
        placeholder="Value"
        class="min-w-24"
        @update:model-value="(v: string) => onValueChange(tag, v)"
        @change="() => {
          if (String(tag.value).length === 0) {
            removeTag(index)
          }
        }"
      />
    </template>
    <UButton
      icon="i-lucide-x"
      variant="subtle"
      color="neutral"
      square
      :aria-label="`Remove ${labelOf(tag.path)} filter`"
      @click="removeTag(index)"
    />
  </UFieldGroup>
</template>
