import { useClientQueries } from 'zenstack-pinia-colada'
import { schema, factory } from '@repo/db/schema'

export const useDbClient = () => {
  return {
    client: useClientQueries(schema, {
      fetch: (url, opts) => fetch(url, {
        ...opts,
        credentials: 'include'
      })
    }),
    zod: factory,
    models: schema.models,
    enums: schema.enums
  }
}
