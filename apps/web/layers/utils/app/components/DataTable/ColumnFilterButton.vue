<script lang="ts" setup generic="T extends Record<string, unknown>">
import { buildFilterCondition, buildNested, fieldsFromColumns, filterNeedsNoInput, filterOperatorsFor, resolveFields, type DataTableColumn, type TableField } from './index'

interface FilterRule {
  id: string
  type: 'rule'
  field: string
  operator: string
  value: string | number | boolean | string[] | null
}

interface FilterGroup {
  id: string
  type: 'group'
  connector: 'AND' | 'OR'
  rules: FilterRule[]
}

type Condition = FilterRule | FilterGroup

const props = defineProps<{
  columns: DataTableColumn<T>[]
  /** When provided, filter/sort fields are resolved from the ZenStack schema instead of `meta`. */
  model?: string
}>()

const filterModel = defineModel<Record<string, unknown>>({ default: () => ({}) })

const fields = computed<TableField[]>(() =>
  props.model
    ? resolveFields({ model: props.model, columns: props.columns, filterSource: 'columns' })
    : fieldsFromColumns(props.columns)
)

const FALLBACK_FIELD: TableField = { name: '', label: '', type: 'String', optional: false, isEnum: false }

const fieldItems = computed(() => fields.value.map(f => ({ label: f.label, value: f.name })))

const getOperators = (f: TableField) => filterOperatorsFor(f)
const getField = (name: string) => fields.value.find(f => f.name === name)
const isEnumMulti = (op: string) => op === 'in' || op === 'notIn'
const ruleValueAsBoolean = (r: FilterRule) => typeof r.value === 'boolean' ? r.value : undefined
const ruleValueAsString = (r: FilterRule) => typeof r.value === 'string' ? r.value : undefined
const getEnumMultiValue = (r: FilterRule): string[] => Array.isArray(r.value) ? r.value as string[] : r.value ? [String(r.value)] : []

const connector = ref<'AND' | 'OR'>('AND')
const conditions = ref<Condition[]>([])

const uid = () => Math.random().toString(36).slice(2, 9)

function getDefaultValue(f: TableField): FilterRule['value'] {
  if (f.type === 'Boolean') return true
  if (f.isEnum && f.enumItems?.length) return f.enumItems[0]!.value
  if (f.type === 'Float' || f.type === 'Int') return 0
  return ''
}

const makeRule = (): FilterRule => {
  const field = fields.value[0]!
  return { id: uid(), type: 'rule', field: field.name, operator: getOperators(field)[0]?.value ?? 'equals', value: getDefaultValue(field) }
}

const addTopRule = () => {
  if (fields.value.length) conditions.value.push(makeRule())
}
const addTopGroup = () => {
  if (fields.value.length) conditions.value.push({ id: uid(), type: 'group', connector: 'OR', rules: [makeRule()] })
}
const addRuleToGroup = (g: FilterGroup) => g.rules.push(makeRule())
const removeTopCondition = (id: string) => conditions.value = conditions.value.filter(c => c.id !== id)
function removeGroupRule(g: FilterGroup, id: string) {
  g.rules = g.rules.filter(r => r.id !== id)
  if (!g.rules.length) removeTopCondition(g.id)
}

function onRuleFieldChange(rule: FilterRule, name: string) {
  const field = getField(name) ?? FALLBACK_FIELD
  rule.field = name
  rule.operator = getOperators(field)[0]?.value ?? 'equals'
  rule.value = getDefaultValue(field)
}

const onRuleOperatorChange = (rule: FilterRule) => {
  rule.value = filterNeedsNoInput(rule.operator) ? '' : getDefaultValue(getField(rule.field) ?? FALLBACK_FIELD)
}

function clearAll() {
  conditions.value = []
  connector.value = 'AND'
  filterModel.value = {}
}

const isValueFilled = (r: FilterRule) => {
  if (filterNeedsNoInput(r.operator)) return true
  if (r.value === null || r.value === undefined || r.value === '') return false
  return !(Array.isArray(r.value) && !r.value.length)
}

const activeCount = computed(() => conditions.value.reduce((n, c) =>
  c.type === 'rule'
    ? n + (isValueFilled(c as FilterRule) ? 1 : 0)
    : n + (c as FilterGroup).rules.filter(isValueFilled).length, 0))

const getEnumItems = (f: TableField | undefined) =>
  f?.enumItems?.length ? f.enumItems : (f?.enumValues?.map(v => ({ label: v, value: v })) ?? [])

function buildRuleWhere(rule: FilterRule): Record<string, unknown> | null {
  const field = getField(rule.field)
  if (!field) return null
  if (filterNeedsNoInput(rule.operator) && !field.optional) return null // null-check on a required field is invalid in Prisma
  const leaf = buildFilterCondition(field, rule.operator, rule.value)
  if (leaf === null && rule.operator !== 'isNull') return null
  return buildNested(rule.field, leaf)
}

function buildGroupWhere(g: FilterGroup): Record<string, unknown> | null {
  const built = g.rules.map(buildRuleWhere).filter(Boolean) as Record<string, unknown>[]
  return !built.length ? null : built.length === 1 ? built[0]! : { [g.connector]: built }
}

function buildWhere(): Record<string, unknown> {
  const built = conditions.value.map(c =>
    c.type === 'rule' ? buildRuleWhere(c as FilterRule) : buildGroupWhere(c as FilterGroup)
  ).filter(Boolean) as Record<string, unknown>[]
  return !built.length ? {} : built.length === 1 ? built[0]! : { [connector.value]: built }
}

/**
 * Serialized model last applied by us (own writes) or seen from outside. Reparse
 * only when it differs, so in-flight edits on `conditions` are never clobbered
 * by our own debounced writes — and edits made in FilterTags stay in sync.
 */
let lastWritten = ''

function serializeRuleValue(val: unknown): FilterRule['value'] {
  if (val === null || val === undefined || val === '') return ''
  if (Array.isArray(val)) return val.map(v => String(v))
  if (val instanceof Date) return formatDate(val, 'YYYY-MM-DD') ?? String(val)
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return val
  return String(val)
}

/** Inverse of `buildRuleWhere`: reconstruct an editable rule from a where fragment. */
function ruleFromLeaf(path: string, leaf: unknown): FilterRule {
  const base = (operator: string, value: FilterRule['value']): FilterRule =>
    ({ id: uid(), type: 'rule', field: path, operator, value })

  if (leaf === null) return base('isNull', '')
  if (typeof leaf !== 'object') return base('equals', leaf as string | number | boolean)

  const obj = leaf as Record<string, unknown>
  if (obj.not === null) return base('isNotNull', '')
  if (obj.not && typeof obj.not === 'object') return base('not', serializeRuleValue((obj.not as Record<string, unknown>).equals))

  const entry = Object.entries(obj).find(([k]) => k !== 'mode' && k !== 'not')
  return entry ? base(entry[0]!, serializeRuleValue(entry[1])) : base('equals', '')
}

/** Rebuild editor state (conditions + top connector) from a where model. */
function conditionsFromWhere(where: Record<string, unknown>): { conditions: Condition[], connector: 'AND' | 'OR' } {
  const entries = Object.entries(where)
  const [firstKey] = entries[0] ?? []

  if (!entries.length) return { conditions: [], connector: 'AND' }
  if (entries.length === 1 && firstKey !== 'AND' && firstKey !== 'OR') {
    const [path, leaf] = entries[0]!
    return { conditions: [ruleFromLeaf(path, leaf)], connector: 'AND' }
  }

  const connector = entries.length === 1 && (firstKey === 'AND' || firstKey === 'OR') ? firstKey : 'AND'
  const list: Record<string, unknown>[] = (connector === 'AND' || connector === 'OR')
    ? (where[connector] as Record<string, unknown>[])
    : entries.map(([k, v]) => ({ [k]: v }))

  const conditions: Condition[] = (list ?? []).map((item) => {
    const itemEntries = Object.entries(item)
    const [k] = itemEntries[0] ?? []
    if (itemEntries.length === 1 && (k === 'AND' || k === 'OR')) {
      return {
        id: uid(),
        type: 'group',
        connector: k,
        rules: (item[k!] as Record<string, unknown>[]).map((next) => {
          const [path, leaf] = Object.entries(next)[0]!
          return ruleFromLeaf(path, leaf)
        })
      }
    }
    const [path, leaf] = itemEntries[0]!
    return ruleFromLeaf(path, leaf)
  })

  return { conditions, connector: connector as 'AND' | 'OR' }
}

watch(filterModel, (model) => {
  const serialized = JSON.stringify(model ?? {})
  if (serialized === lastWritten) return
  lastWritten = serialized
  const synced = conditionsFromWhere(model ?? {})
  conditions.value = synced.conditions
  connector.value = synced.connector
}, { immediate: true, deep: true })

const debouncedSync = useDebounceFn(() => {
  const next = buildWhere()
  const serialized = JSON.stringify(next)
  if (serialized === lastWritten) return
  lastWritten = serialized
  filterModel.value = next
}, 400)

watch([conditions, connector], debouncedSync, { deep: true })
</script>

<template>
  <UPopover
    title="Filters"
    :ui="{ content: 'max-w-lg p-0 divide-y divide-default [&>div]:p-2 [&>div]:flex [&>div]:gap-2' }"
  >
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-filter"
      square
      :ui="{ leadingIcon: 'sm:text-dimmed', label: 'max-sm:hidden' }"
      label="Filter"
    >
      <template #leading>
        <UChip
          :show="activeCount > 0"
        >
          <UIcon
            name="i-lucide-filter"
            class="size-5 sm:text-dimmed"
          />
        </UChip>
      </template>
    </UButton>
    <template #content>
      <div class="flex-col">
        <UFormField
          v-if="conditions.length > 1"
          label="Match"
          orientation="horizontal"
          size="sm"
          :ui="{ label: 'ms-2' }"
        >
          <USelect
            v-model="connector"
            :items="[{ label: 'ALL conditions (AND)', value: 'AND' }, { label: 'ANY condition (OR)', value: 'OR' }]"
          />
        </UFormField>
        <UAlert
          v-if="conditions.length === 0"
          icon="i-lucide-filter-x"
          title="No filters applied"
          description="Add a filter or group to narrow down results"
          variant="soft"
          color="neutral"
        />
        <div
          v-else
          class="flex flex-col gap-2"
        >
          <template
            v-for="(condition, index) in conditions"
            :key="condition.id"
          >
            <USeparator
              v-if="index > 0"
              :label="connector"
              :ui="{ label: 'text-xs text-muted' }"
            />

            <div
              v-if="condition.type === 'rule'"
              class="flex items-center gap-1.5 bg-elevated/50 rounded-lg p-1.5"
            >
              <USelect
                :model-value="condition.field"
                :items="fieldItems"
                size="sm"
                class="w-40 shrink-0"
                @update:model-value="(v: string) => onRuleFieldChange(condition as FilterRule, v)"
              />

              <USelect
                v-model="condition.operator"
                :items="getOperators(getField(condition.field) ?? FALLBACK_FIELD)"
                size="sm"
                class="w-36 shrink-0"
                @update:model-value="() => onRuleOperatorChange(condition)"
              />

              <template v-if="!filterNeedsNoInput(condition.operator)">
                <USelect
                  v-if="getField(condition.field)?.type === 'Boolean'"
                  :model-value="ruleValueAsBoolean(condition)"
                  :items="[{ label: 'True', value: true }, { label: 'False', value: false }]"
                  size="sm"
                  class="flex-1 min-w-0"
                  @update:model-value="(v: boolean) => (condition.value = v)"
                />
                <USelect
                  v-else-if="getField(condition.field)?.isEnum && !isEnumMulti(condition.operator)"
                  :model-value="ruleValueAsString(condition)"
                  :items="getEnumItems(getField(condition.field))"
                  size="sm"
                  class="flex-1 min-w-0"
                  @update:model-value="(v: string) => (condition.value = v)"
                />
                <USelectMenu
                  v-else-if="getField(condition.field)?.isEnum && isEnumMulti(condition.operator)"
                  :model-value="getEnumMultiValue(condition)"
                  :items="getEnumItems(getField(condition.field))"
                  value-key="value"
                  label-key="label"
                  multiple
                  size="sm"
                  class="flex-1 min-w-0"
                  @update:model-value="(v: string[]) => (condition.value = v)"
                />
                <UInput
                  v-else-if="getField(condition.field)?.type === 'DateTime'"
                  v-model="condition.value as string"
                  type="date"
                  size="sm"
                  class="flex-1 min-w-0"
                />
                <UInputNumber
                  v-else-if="['Float', 'Int'].includes(getField(condition.field)?.type ?? '')"
                  v-model="condition.value as number"
                  :step="getField(condition.field)?.type === 'Float' ? 0.01 : 1"
                  :decrement="false"
                  :increment="false"
                  size="sm"
                  class="flex-1 min-w-0"
                />
                <UInput
                  v-else
                  :model-value="ruleValueAsString(condition) ?? ''"
                  size="sm"
                  class="flex-1 min-w-0"
                  placeholder="Value"
                  @update:model-value="(v: string) => (condition.value = v)"
                />
              </template>
              <div
                v-else
                class="flex-1 text-xs text-muted px-1"
              >
                no value needed
              </div>

              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                square
                @click="removeTopCondition(condition.id)"
              />
            </div>

            <div
              v-else-if="condition.type === 'group'"
              class="border border-dashed border-default rounded-lg p-1.5 flex flex-col gap-2"
            >
              <div class="flex items-center gap-2">
                <UBadge
                  label="Group"
                  color="neutral"
                  variant="subtle"
                />
                <USelect
                  v-model="condition.connector"
                  :items="[{ label: 'AND', value: 'AND' }, { label: 'OR', value: 'OR' }]"
                  size="xs"
                  class="w-24"
                />
                <span class="text-xs text-muted">between conditions</span>
                <div class="flex-1" />
                <UButton
                  icon="i-lucide-trash-2"
                  variant="ghost"
                  color="error"
                  size="xs"
                  square
                  @click="removeTopCondition(condition.id)"
                />
              </div>

              <div
                v-for="(rule) in condition.rules"
                :key="rule.id"
                class="flex flex-col gap-1"
              >
                <div class="flex items-center gap-1.5 bg-elevated/50 rounded-lg px-2.5 py-2">
                  <USelect
                    :model-value="rule.field"
                    :items="fieldItems"
                    size="sm"
                    class="w-36 shrink-0"
                    @update:model-value="(v: string) => onRuleFieldChange(rule, v)"
                  />
                  <USelect
                    v-model="rule.operator"
                    :items="getOperators(getField(rule.field) ?? FALLBACK_FIELD)"
                    size="sm"
                    class="w-32 shrink-0"
                    @update:model-value="() => onRuleOperatorChange(rule)"
                  />
                  <template v-if="!filterNeedsNoInput(rule.operator)">
                    <USelect
                      v-if="getField(rule.field)?.type === 'Boolean'"
                      :model-value="ruleValueAsBoolean(rule)"
                      :items="[{ label: 'True', value: true }, { label: 'False', value: false }]"
                      size="sm"
                      class="flex-1 min-w-0"
                      @update:model-value="(v: boolean) => (rule.value = v)"
                    />
                    <USelect
                      v-else-if="getField(rule.field)?.isEnum && !isEnumMulti(rule.operator)"
                      :model-value="ruleValueAsString(rule)"
                      :items="getEnumItems(getField(rule.field))"
                      size="sm"
                      class="flex-1 min-w-0"
                      @update:model-value="(v: string) => (rule.value = v)"
                    />
                    <USelectMenu
                      v-else-if="getField(rule.field)?.isEnum && isEnumMulti(rule.operator)"
                      :model-value="getEnumMultiValue(rule)"
                      :items="getEnumItems(getField(rule.field))"
                      value-key="value"
                      label-key="label"
                      multiple
                      size="sm"
                      class="flex-1 min-w-0"
                      @update:model-value="(v: string[]) => (rule.value = v)"
                    />
                    <UInput
                      v-else-if="getField(rule.field)?.type === 'DateTime'"
                      v-model="rule.value as string"
                      type="date"
                      size="sm"
                      class="flex-1 min-w-0"
                    />
                    <UInputNumber
                      v-else-if="['Float', 'Int'].includes(getField(rule.field)?.type ?? '')"
                      v-model="rule.value as number"
                      :step="getField(rule.field)?.type === 'Float' ? 0.01 : 1"
                      :decrement="false"
                      :increment="false"
                      size="sm"
                      class="flex-1 min-w-0"
                    />
                    <UInput
                      v-else
                      v-model="rule.value as string"
                      size="sm"
                      class="flex-1 min-w-0"
                      placeholder="Value..."
                    />
                  </template>
                  <div
                    v-else
                    class="flex-1 text-xs text-muted px-1"
                  >
                    no value needed
                  </div>

                  <UButton
                    icon="i-lucide-x"
                    variant="ghost"
                    color="neutral"
                    size="sm"
                    square
                    @click="removeGroupRule(condition, rule.id)"
                  />
                </div>
              </div>

              <UButton
                icon="i-lucide-plus"
                label="Add condition"
                variant="ghost"
                color="neutral"
                size="sm"
                class="self-start mt-1"
                @click="addRuleToGroup(condition)"
              />
            </div>
          </template>
        </div>
      </div>
      <div>
        <UButton
          icon="i-lucide-plus"
          label="Add filter"
          variant="soft"
          color="neutral"
          size="sm"
          @click="addTopRule"
        />
        <UButton
          icon="i-lucide-layers"
          label="Add group filter"
          variant="soft"
          color="neutral"
          size="sm"
          @click="addTopGroup"
        />
        <div class="flex-1" />
        <UButton
          v-if="conditions.length > 0"
          label="Clear all"
          variant="ghost"
          color="error"
          size="sm"
          icon="i-lucide-filter-x"
          @click="clearAll"
        />
      </div>
    </template>
  </UPopover>
</template>
