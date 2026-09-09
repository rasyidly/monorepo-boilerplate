import type { schema } from '@repo/db/schema'
import type { FindManyArgs, GetModels, ModelResult } from '@repo/db'
import type { SchemaType } from '@repo/db/zenstack/schema'

/** Union of all ZenStack model names. */
export type ZenstackModelName = GetModels<typeof schema>

/** Row type of a ZenStack model (scalar + relation fields). */
export type ZenstackRow<M extends ZenstackModelName> = ModelResult<SchemaType, M>

/** `where` shape of a ZenStack model's find-many query. */
export type ZenstackWhere<M extends ZenstackModelName> = FindManyArgs<SchemaType, M>['where']
