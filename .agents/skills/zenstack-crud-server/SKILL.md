---
name: zenstack-crud-server
description: Expose ZenStack V3 data as automatic CRUD web APIs ("Query as a Service") and consume them. Use when adding REST/RPC endpoints with a server adapter (Express, Fastify, Next.js, Nuxt, SvelteKit, Hono, Elysia, TanStack Start), wiring per-request access control via getClient/$setAuth, generating an OpenAPI spec, or calling the API from a client (fetch-client, TanStack Query hooks).
---

# ZenStack V3 — Automatic CRUD Services (Query as a Service)

ZenStack turns your data model into secure CRUD web APIs with no hand-written controllers. Two
pieces combine:

- **API handler** — framework-agnostic; defines the API style (RPC or RESTful) and translates HTTP
  requests into ORM queries. From `@zenstackhq/server/api`.
- **Server adapter** — framework-specific glue that installs a handler into Express/Next.js/etc. and
  supplies a per-request, policy-enforced ORM client. From `@zenstackhq/server/<framework>`.

```
HTTP request → server adapter → API handler (RPC | REST) → ZenStack ORM (policies applied) → DB
```

This builds on the other skills: define the schema with `zenstack-schema-modeling`, secure it with
`zenstack-access-control`, and create the base client with `zenstack-querying`. Install the server
package: `npm install @zenstackhq/server`.

## API handlers

**RPC** — mirrors the ORM API 1:1. Routes look like `GET /post/findMany?q=<urlencoded-json>` and
`POST /post/create` (body `{ data: ... }`); responses are wrapped in `{ data: ... }`.

```ts
import { RPCApiHandler } from '@zenstackhq/server/api';
import { schema } from '~/zenstack/schema';

const apiHandler = new RPCApiHandler({ schema });
```

RPC endpoints: every ORM op (`findMany`, `findUnique`, `findFirst`, `count`, `aggregate`,
`groupBy`, `create`, `createMany`, `createManyAndReturn`, `upsert`, `update`, `updateMany`,
`updateManyAndReturn`, `delete`, `deleteMany`), plus `$procs/<name>` for custom procedures and
`$transaction/sequential`. Status codes: `201` create, `200` other success, `400` malformed,
`403` policy violation, `404` not found, `422` validation error, `500` unexpected.

**RESTful** — JSON:API v1.1 compliant. Routes like `GET /post`, `GET /post/:id`, `POST /post`,
`PUT|PATCH /post/:id`, `DELETE /post/:id`, plus relationship routes.

```ts
import { RestApiHandler } from '@zenstackhq/server/api'; // note: RestApiHandler, not RESTful

const apiHandler = new RestApiHandler({
    schema,
    endpoint: 'http://localhost:3000/api', // required — used to build resource links
});
```

`RestApiHandler` options: `endpoint` (required), `pageSize` (default 100; `Infinity` disables
paging), `modelNameMapping` (`{ User: 'users' }`), `externalIdMapping` (`{ Tag: 'name' }`),
`nestedRoutes` (bool). REST query params: `filter[field]=`, `filter[field$op]=` (`$lt`,`$gt`,
`$contains`,`$startsWith`,…), `sort=field,-other`, `page[offset]=`/`page[limit]=`,
`include=rel,rel.nested`, `fields[type]=a,b`.

Both handlers also accept `queryOptions` for **slicing/omitting** what the API exposes:

```ts
new RPCApiHandler({
    schema,
    queryOptions: {
        slicing: {
            includedModels: ['User', 'Post'],
            models: { post: { excludedOperations: ['delete'] } },
        },
        omit: { user: { password: true } },
    },
});
```

## Server adapters — `getClient` is where access control lives

Every adapter takes `apiHandler` and a `getClient(request) => ClientContract` callback. Return a
**policy-enforced client bound to the current user** via `$setAuth` (see `zenstack-access-control`),
so each request is isolated:

```ts
getClient: (req) => authDb.$setAuth(getSessionUser(req)),
```

`authDb` is `db.$use(new PolicyPlugin())`. Return `authDb.$setAuth(undefined)` for anonymous, or the
raw `db` to bypass policies (rarely what you want for a public API).

### Express

```ts
import { ZenStackMiddleware } from '@zenstackhq/server/express';

app.use(express.json());
app.use(
    '/api/model',
    ZenStackMiddleware({
        apiHandler,
        getClient: (req) => authDb.$setAuth(getSessionUser(req)),
    }),
);
```

(Optional `sendResponse: false` writes to `res.locals` and calls `next()` instead.)

### Fastify

```ts
import { ZenStackFastifyPlugin } from '@zenstackhq/server/fastify';

server.register(ZenStackFastifyPlugin, {
    prefix: '/api/model', // required
    apiHandler,
    getClient: (req) => authDb.$setAuth(getSessionUser(req)),
});
```

### Next.js — App Router

```ts
// src/app/api/model/[...path]/route.ts
import { NextRequestHandler } from '@zenstackhq/server/next';

const handler = NextRequestHandler({
    apiHandler,
    getClient: (req) => authDb.$setAuth(getSessionUser(req)),
    useAppDir: true,
});
export {
    handler as GET,
    handler as POST,
    handler as PUT,
    handler as PATCH,
    handler as DELETE,
};
```

### Next.js — Pages Router

```ts
// src/pages/api/model/[...path].ts
import { NextRequestHandler } from '@zenstackhq/server/next';

export default NextRequestHandler({
    apiHandler,
    getClient: (req, res) => authDb.$setAuth(getSessionUser(req, res)),
});
```

### Nuxt

```ts
// server/api/model/[...].ts
import { createEventHandler } from '@zenstackhq/server/nuxt';

export default createEventHandler({
    apiHandler,
    getClient: (event) => authDb.$setAuth(getSessionUser(event)),
});
```

### SvelteKit (API route — preferred; wildcard param must be named `path`)

```ts
// src/routes/api/model/[...path]/+server.ts
import { SvelteKitRouteHandler } from '@zenstackhq/server/sveltekit';

const handler = SvelteKitRouteHandler({
    apiHandler,
    getClient: (event) => authDb.$setAuth(getSessionUser(event)),
});
export const GET = handler,
    POST = handler,
    PUT = handler,
    PATCH = handler,
    DELETE = handler;
```

(Legacy `SvelteKitHandler` in `hooks.server.ts` with a `prefix` option is deprecated.)

### Hono

```ts
import { createHonoHandler } from '@zenstackhq/server/hono';

app.use(
    '/api/model/*',
    createHonoHandler({
        apiHandler,
        getClient: (ctx) => authDb.$setAuth(getSessionUser(ctx)),
    }),
);
```

### Elysia

```ts
import { createElysiaHandler } from '@zenstackhq/server/elysia';

app.group('/crud', (app) =>
    app.use(
        createElysiaHandler({
            apiHandler,
            basePath: '/api/model',
            getClient: (ctx) => authDb.$setAuth(getSessionUser(ctx)),
        }),
    ),
);
```

### TanStack Start

```ts
// app/routes/api/$.ts
import { TanStackStartHandler } from '@zenstackhq/server/tanstack-start';

const handler = TanStackStartHandler({
    apiHandler,
    getClient: (req) => authDb.$setAuth(getSessionUser(req)),
});
export const Route = createFileRoute('/api/$')({
    server: {
        handlers: {
            GET: handler,
            POST: handler,
            PUT: handler,
            PATCH: handler,
            DELETE: handler,
        },
    },
});
```

## Data type serialization

Handlers use **superjson** so non-JSON types survive the wire: `DateTime` → ISO string, `Bytes` →
base64, `BigInt`/`Decimal` → string. The generated client SDKs handle this automatically. If you
hand-craft requests, include the superjson `meta` under a `serialization` key
(`{ "data": ..., "meta": { "serialization": <meta> } }`); responses carry the same.

## Consuming the API

### Fetch client (v3.7.0+, RPC APIs only)

```ts
import { createClient } from '@zenstackhq/fetch-client';
import { schema } from '~/zenstack/schema';

const client = createClient(schema, {
    endpoint: 'https://example.com/api/model',
});
const users = await client.user.findMany({ include: { posts: true } });
await client.post.create({ data: { title: 'Hello' } });
```

Add auth via a custom `fetch`:

```ts
import type { FetchFn } from '@zenstackhq/fetch-client';
const fetchFn: FetchFn = (url, init) =>
    fetch(url, {
        ...init,
        headers: { ...init?.headers, authorization: `Bearer ${getToken()}` },
    });
createClient(schema, { endpoint, fetch: fetchFn });
```

Custom procedures: `client.$procs.getStats.query()` / `client.$procs.send.mutate({ args })`.
Sequential tx: `client.$transaction([{ model, op, args }, ...])`.

### TanStack Query hooks (RPC APIs only; React 18+/Vue 3+/Svelte 5.25+)

Install `@zenstackhq/tanstack-query` and the matching `@tanstack/*-query`. Provide settings near the
root (React shown; Vue uses `provideQuerySettingsContext`, Svelte `setQuerySettingsContext`):

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuerySettingsProvider } from '@zenstackhq/tanstack-query/react';

<QueryClientProvider client={new QueryClient()}>
    <QuerySettingsProvider value={{ endpoint: '/api/model' }}>
        {children}
    </QuerySettingsProvider>
</QueryClientProvider>;
```

Hooks mirror the ORM client via `useClientQueries(schema)`:

```ts
import { useClientQueries } from '@zenstackhq/tanstack-query/react';

const client = useClientQueries(schema);
const { data } = client.user.useFindMany({ include: { posts: true } });
const create = client.post.useCreate();
create.mutate({ data: { title: 'New post' } });
```

- **Auto invalidation**: mutations invalidate affected queries automatically (respects nested
  reads/writes and cascades). Opt out per mutation with `{ invalidateQueries: false }`.
- **Optimistic updates**: `client.post.useCreate({ optimisticUpdate: true })`; customize with
  `optimisticUpdateProvider`.
- Also: `useInfiniteFindMany`, `$procs.<name>.useQuery()/useMutation()`,
  `$transaction.useSequential()`, and `DbNull`/`JsonNull`/`AnyNull` exports for JSON nulls.

A community **Pinia Colada** integration exists as `zenstack-pinia-colada` (Vue 3).

## OpenAPI spec

Both handlers can emit an OpenAPI spec via `generateSpec()` (RPC v3.6.0+, REST v3.5.0+):

```ts
import type { OpenApiSpecOptions } from '@zenstackhq/server/api';

app.get('/api/openapi.json', async (_req, res) => {
    const spec = await apiHandler.generateSpec({
        title: 'My Blog API',
        version: '2.0.0',
        respectAccessPolicies: true, // emit 403 responses for policy-protected models
    });
    res.json(spec);
});
```

Options: `title` (default `'ZenStack Generated API'`), `version` (default `'1.0.0'`), `description`,
`summary`, `respectAccessPolicies` (default false). `queryOptions.slicing`/`omit` on the handler
also shape what appears in the spec.

## Reference docs

Full ZenStack documentation for this topic is bundled under [`references/`](references/):

- [service-overview.md](references/service-overview.md) — automatic CRUD service overview
- [server-adapter.md](references/server-adapter.md) — server adapter concepts
- [api-handler-overview.md](references/api-handler-overview.md) — API handlers overview
- [api-handler-rpc.md](references/api-handler-rpc.md) — RPC API handler
- [api-handler-rest.md](references/api-handler-rest.md) — RESTful API handler
- [client-sdk-overview.md](references/client-sdk-overview.md) — client SDK overview
- [fetch-client.md](references/fetch-client.md) — fetch client
- [tanstack-query.md](references/tanstack-query.md) — TanStack Query hooks
- [openapi-overview.md](references/openapi-overview.md) — OpenAPI overview
- [openapi-rpc.md](references/openapi-rpc.md) — OpenAPI for RPC
- [openapi-restful.md](references/openapi-restful.md) — OpenAPI for REST
- [api-reference.md](references/api-reference.md) — server API reference
- Server adapters: [express](references/adapter-express.md), [fastify](references/adapter-fastify.md), [next](references/adapter-next.md), [nuxt](references/adapter-nuxt.md), [sveltekit](references/adapter-sveltekit.md), [hono](references/adapter-hono.md), [elysia](references/adapter-elysia.md), [tanstack-start](references/adapter-tanstack-start.md)
