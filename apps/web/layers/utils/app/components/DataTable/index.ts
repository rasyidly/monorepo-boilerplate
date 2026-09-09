import { schema } from '@repo/db/schema'
import type { TableColumn } from '@nuxt/ui'

// ── Types ─────────────────────────────────────────────────────────────────

export type CellType = 'text' | 'longtext' | 'number' | 'date' | 'email' | 'boolean' | 'enum' | 'url'

export type SortDirection = 'asc' | 'desc'

/** Object-form sort node, e.g. `{ author: { name: 'desc' } }`. */
export type SortEntry = Record<string, unknown>

export interface TableCellMeta {
  label?: string
  cellType?: CellType
  enum?: Array<{ value?: string | null, label: string, color?: string, icon?: string, variant?: string }>
  filterable?: boolean
}

export interface TableField {
  name: string
  label: string
  type: string
  optional: boolean
  isEnum: boolean
  enumValues?: string[]
  enumItems?: Array<{ value: string, label: string }>
}

/** Minimal TanStack column surface the header dropdown uses for pin/hide. */
export interface DataTableColumnInstance {
  id: string
  columnDef: { accessorKey?: unknown, header?: unknown, meta?: unknown }
  getIsPinned: () => 'left' | 'right' | false
  pin: (position: 'left' | 'right' | false) => void
  toggleVisibility: (visible: boolean) => void
}

/** DataTable column: Nuxt UI column + label/icon/cell-type metadata. */
export type DataTableColumn<T extends Record<string, unknown>>
  = TableColumn<T> & { meta?: TableCellMeta & { icon?: string } }

// ── Sorting helpers (object-form orderBy, the ZenStack convention) ────────

// ── Sorting helpers (Prisma orderBy array: single-key entries per sort) ────

/** Dotted field of a single-key sort entry, e.g. `{ author: { name: 'asc' } }` → `author.name`. */
function sortEntryPath(entry: SortEntry): string {
  const parts: string[] = []
  let node = entry
  for (; ;) {
    const [key, val] = Object.entries(node)[0] ?? []
    if (!key) break
    parts.push(key)
    if (val && typeof val === 'object') node = val as Record<string, unknown>
    else break
  }
  return parts.join('.')
}

/** Build a (possibly nested) sort entry, e.g. `author.name` + 'asc' → `{ author: { name: 'asc' } }`. */
function buildSortEntry(segments: string[], dir: SortDirection): SortEntry {
  return segments.reduceRight((acc, key) => ({ [key]: acc }), dir as unknown as SortEntry)
}

/**
 * Flatten an orderBy array into (dotted field, direction) pairs,
 * e.g. `[{ author: { name: 'asc' } }, { content: 'asc' }]` → `author.name` asc, `content` asc.
 */
export function orderToPairs(entries: SortEntry[]): Array<{ field: string, direction: SortDirection }> {
  const out: Array<{ field: string, direction: SortDirection }> = []
  const walk = (node: Record<string, unknown>, prefix: string) => {
    const [key, val] = Object.entries(node)[0] ?? []
    if (!key) return
    const field = prefix ? `${prefix}.${key}` : key
    if (val === 'asc' || val === 'desc') out.push({ field, direction: val })
    else if (val && typeof val === 'object') walk(val as Record<string, unknown>, field)
  }
  for (const entry of entries) walk(entry, '')
  return out
}

/** Remove the sort entry matching a (possibly dotted) path. */
export function removePath(entries: SortEntry[], segments: string[]): SortEntry[] {
  const path = segments.join('.')
  return entries.filter(e => sortEntryPath(e) !== path)
}

/** Replace (or append) the sort entry for a (possibly dotted) path, preserving its index. */
export function setSortPath(entries: SortEntry[], segments: string[], dir: SortDirection): SortEntry[] {
  const next = buildSortEntry(segments, dir)
  const path = segments.join('.')
  const index = entries.findIndex(e => sortEntryPath(e) === path)
  if (index === -1) return [...entries, next]
  return entries.map((e, i) => (i === index ? next : e))
}

/** Return the sort direction matching a (possibly dotted) path, or null. */
export function getNestedSortDir(entries: SortEntry[], dotPath: string): SortDirection | null {
  const [first, ...rest] = dotPath.split('.')
  const entry = entries.find(e => first! in e)
  if (!entry) return null
  if (!rest.length) return (entry[first!] as SortDirection) ?? null
  const nested = entry[first!]
  if (typeof nested !== 'object' || nested === null) return null
  return getNestedSortDir([nested as SortEntry], rest.join('.'))
}

// ── Labels & where/update builders ────────────────────────────────────────

/** Split camelCase into spaced capitalized words, e.g. `birthDate` → `Birth Date`. */
export function autoLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim()
}

/** Build a nested object from a dotted path, e.g. `author.name` → `{ author: { name: <leaf> } }`. */
export function buildNested(dotPath: string, leaf: unknown): Record<string, unknown> {
  return dotPath.split('.').reduceRight<Record<string, unknown>>(
    (acc, key) => ({ [key]: acc }),
    leaf as Record<string, unknown>
  )
}

// ── Filter/sort field resolution ──────────────────────────────────────────

/** Read a column's accessorKey (not exposed on the union `TableColumn` type). */
function getAccessor(col: object): string | null {
  const key = (col as { accessorKey?: unknown }).accessorKey
  return typeof key === 'string' && key ? key : null
}

const CELL_TYPE_TO_TYPE: Record<string, string> = {
  text: 'String',
  longtext: 'String',
  email: 'String',
  url: 'String',
  number: 'Float',
  date: 'DateTime',
  boolean: 'Boolean',
  enum: 'Enum'
}

/**
 * Derive filter/sort fields straight from column definitions (cellType →
 * schema-ish type, dotted accessorKey preserved for nested relations).
 */
export function fieldsFromColumns<T extends Record<string, unknown>>(columns: DataTableColumn<T>[]): TableField[] {
  const out: TableField[] = []
  for (const col of columns) {
    const name = getAccessor(col)
    const cellType = col.meta?.cellType
    if (!name || !cellType || col.meta?.filterable === false) continue
    const type = CELL_TYPE_TO_TYPE[cellType]
    if (!type) continue
    const enumItems = (col.meta?.enum ?? [])
      .filter((e): e is { value: string, label: string } => typeof e.value === 'string')
      .map(e => ({ value: e.value, label: e.label }))
    out.push({
      name,
      label: col.meta?.label ?? autoLabel(name),
      type,
      optional: true,
      isEnum: cellType === 'enum' && enumItems.length > 0,
      enumItems
    })
  }
  return out
}

// ── Filter condition builders ─────────────────────────────────────────────

/** Operator options per field type; `value` is the Prisma operator key. */
export const FILTER_OPERATORS: Record<string, Array<{ label: string, value: string }>> = {
  String: [
    { label: 'Contains', value: 'contains' },
    { label: 'Equals', value: 'equals' },
    { label: 'Not equals', value: 'not' },
    { label: 'Starts with', value: 'startsWith' },
    { label: 'Ends with', value: 'endsWith' },
    { label: 'Is empty', value: 'isNull' },
    { label: 'Is not empty', value: 'isNotNull' }
  ],
  Boolean: [{ label: 'Is', value: 'equals' }],
  DateTime: [
    { label: 'Is', value: 'equals' },
    { label: 'Is after', value: 'gt' },
    { label: 'Is on or after', value: 'gte' },
    { label: 'Is before', value: 'lt' },
    { label: 'Is on or before', value: 'lte' },
    { label: 'Is empty', value: 'isNull' },
    { label: 'Is not empty', value: 'isNotNull' }
  ],
  Float: [
    { label: 'Equals', value: 'equals' },
    { label: 'Greater than', value: 'gt' },
    { label: 'Greater than or equal', value: 'gte' },
    { label: 'Less than', value: 'lt' },
    { label: 'Less than or equal', value: 'lte' },
    { label: 'Is empty', value: 'isNull' },
    { label: 'Is not empty', value: 'isNotNull' }
  ],
  Int: [
    { label: 'Equals', value: 'equals' },
    { label: 'Greater than', value: 'gt' },
    { label: 'Greater than or equal', value: 'gte' },
    { label: 'Less than', value: 'lt' },
    { label: 'Less than or equal', value: 'lte' },
    { label: 'Is empty', value: 'isNull' },
    { label: 'Is not empty', value: 'isNotNull' }
  ],
  Enum: [
    { label: 'Is', value: 'equals' },
    { label: 'Is any of', value: 'in' },
    { label: 'Is none of', value: 'notIn' }
  ]
}

/**
 * Operator options for a field. Emptiness operators (`isNull`/`isNotNull`) only make
 * sense on optional fields — Prisma rejects `{ not: null }` / `null` on required scalars.
 */
export function filterOperatorsFor(field: TableField): Array<{ label: string, value: string }> {
  const ops = FILTER_OPERATORS[field.isEnum ? 'Enum' : field.type] ?? [{ label: 'Equals', value: 'equals' }]
  return field.optional ? ops : ops.filter(o => o.value !== 'isNull' && o.value !== 'isNotNull')
}

/** Operator keys that need no value input. */
export function filterNeedsNoInput(operator: string): boolean {
  return operator === 'isNull' || operator === 'isNotNull'
}

/**
 * Compile (operator, value) into a Prisma leaf condition for a resolved field.
 * Returns `null` when the value is missing/invalid — except for `isNull`, whose
 * valid leaf is literally `null`. Callers must special-case `operator === 'isNull'`.
 */
export function buildFilterCondition(field: TableField, operator: string, value: unknown): Record<string, unknown> | null {
  if (operator === 'isNull') return null
  if (operator === 'isNotNull') return { not: null }

  if (value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length)) return null

  let val: unknown = value
  if (field.type === 'DateTime') {
    val = value instanceof Date ? value : new Date(String(value))
    if (!(val instanceof Date) || isNaN(val.getTime())) return null
  } else if (field.type === 'Float') {
    val = parseFloat(String(value))
    if (isNaN(val as number)) return null
  } else if (field.type === 'Int') {
    val = parseInt(String(value))
    if (isNaN(val as number)) return null
  } else if (field.type === 'Boolean') {
    val = value === true || value === 'true'
  }

  if (operator === 'in' || operator === 'notIn') return { [operator]: Array.isArray(val) ? val : [val] }

  const strMode = field.type === 'String' ? { mode: 'insensitive' as const } : {}
  if (operator === 'not') return { not: { equals: val, ...strMode } }
  return { [operator]: val, ...strMode }
}

// Schema-backed resolution (ZenStack = single source of truth for field types)

const SYSTEM_EXCLUDED = ['id', 'organizationId', 'updatedAt', 'createdBy', 'archivedAt', 'deletedAt', 'createdAt']

interface FieldDefLike {
  name: string
  type: string
  optional?: boolean
  array?: boolean
  relation?: boolean
  foreignKeyFor?: string[]
}

interface ModelDefLike {
  fields: Record<string, FieldDefLike>
}

interface EnumDefLike {
  values: Record<string, string>
}

interface ResolvedField {
  type: string
  optional: boolean
  isEnum: boolean
  enumValues?: string[]
}

interface ColumnLike {
  id?: string
  accessorKey?: unknown
  meta?: Partial<TableCellMeta>
}

const schemaModels = schema.models as unknown as Record<string, ModelDefLike>
const schemaEnums = (schema.enums ?? {}) as unknown as Record<string, EnumDefLike>

/** Resolve a (possibly dotted/relation) field from the ZenStack schema. */
function resolveFieldType(model: string, dotPath: string): ResolvedField | null {
  const parts = dotPath.split('.')
  let modelDef: ModelDefLike | undefined = schemaModels[model]
  for (let i = 0; i < parts.length; i++) {
    const key = parts[i]!
    if (!modelDef) return null
    const field = modelDef.fields[key]
    if (!field) return null
    if (i < parts.length - 1) {
      if (!field.relation || field.array) return null
      modelDef = schemaModels[field.type]
      continue
    }
    if (field.relation || (field.foreignKeyFor?.length ?? 0) > 0) return null
    const isEnum = field.type in schemaEnums
    return {
      type: field.type,
      optional: field.optional ?? false,
      isEnum,
      enumValues: isEnum ? Object.values(schemaEnums[field.type]!.values) : undefined
    }
  }
  return null
}

/**
 * Map a column `cellType` to a schema-ish field type so the filter rule-builder
 * can pick operators even without a ZenStack model (native JSON tables).
 */
const CELL_TYPE_TO_FIELD_TYPE: Record<string, string> = {
  text: 'String',
  longtext: 'String',
  email: 'String',
  url: 'String',
  number: 'Float',
  date: 'DateTime',
  boolean: 'Boolean',
  enum: 'Enum'
}

function resolveFromColumns(options: {
  columns?: ColumnLike[]
  model?: string
}): TableField[] {
  const fromColumns: TableField[] = []
  for (const col of options.columns ?? []) {
    const accessorKey = col.accessorKey
    if (typeof accessorKey !== 'string' || !accessorKey || col.id === 'select' || col.id === 'actions') continue
    if (col.meta?.filterable === false) continue

    let resolved: ResolvedField | null = null
    if (options.model) {
      resolved = resolveFieldType(options.model, accessorKey)
    }

    const metaEnumItems = (col.meta?.enum ?? [])
      .filter((e): e is { value: string, label: string } => typeof e.value === 'string')
      .map(e => ({ value: e.value, label: e.label }))

    if (!resolved) {
      const type = col.meta?.cellType ? CELL_TYPE_TO_FIELD_TYPE[col.meta.cellType] : undefined
      if (!type) continue
      resolved = {
        type,
        optional: true,
        isEnum: col.meta?.cellType === 'enum' && metaEnumItems.length > 0
      }
    }

    fromColumns.push({
      name: accessorKey,
      label: col.meta?.label ?? autoLabel(accessorKey.replace(/\./g, ' ')),
      type: resolved.type,
      optional: resolved.optional,
      isEnum: resolved.isEnum,
      enumValues: resolved.enumValues,
      enumItems: metaEnumItems.length
        ? metaEnumItems
        : (resolved.isEnum ? resolved.enumValues?.map(v => ({ value: v, label: v })) : undefined)
    })
  }
  return fromColumns
}

export function resolveFields(options: {
  model?: string
  columns?: ColumnLike[]
  filterSource?: 'columns' | 'schema'
  excludeFields?: string[]
}): TableField[] {
  const exclude = options.excludeFields ?? []
  const modelDef = options.model ? schemaModels[options.model] : undefined

  if (options.filterSource === 'columns' && options.columns?.length) {
    return resolveFromColumns({ columns: options.columns, model: options.model })
  }

  if (modelDef) {
    return Object.values(modelDef.fields)
      .filter(f => !f.array && !f.relation && !f.foreignKeyFor?.length
        && !SYSTEM_EXCLUDED.includes(f.name) && !exclude.includes(f.name))
      .map((f) => {
        const isEnum = f.type in schemaEnums
        return {
          name: f.name,
          label: autoLabel(f.name),
          type: f.type,
          optional: f.optional ?? false,
          isEnum,
          enumValues: isEnum ? Object.values(schemaEnums[f.type]!.values) : undefined
        }
      })
  }

  return []
}
