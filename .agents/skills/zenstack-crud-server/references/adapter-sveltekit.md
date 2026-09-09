---
title: SvelteKit
description: Adapter for integrating with SvelteKit
---

# SvelteKit Adapter

<p>The <code>@zenstackhq/server/sveltekit</code> module provides a quick way to install a full set of CRUD API onto <a href=https://kit.svelte.dev/  target="_blank">SvelteKit</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

There are two ways to mount the ZenStack API in SvelteKit: as API routes or server hooks (deprecated).

#### API Routes

You can mount the services at specific path as [API routes](https://svelte.dev/tutorial/kit/get-handlers) like the following:

```ts title='/src/routes/api/model/[...path]/+server.ts'
import { SvelteKitRouteHandler } from "@zenstackhq/server/sveltekit";
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { db } from '~/db';
import { schema } from '~/zenstack/schema';

const handler = SvelteKitRouteHandler({
  apiHandler: new RPCApiHandler({ schema }),
  // getSessionUser extracts the current session user from the request, its
  // implementation depends on your auth solution
  getClient: (event) => db.$setAuth(getSessionUser(event)),
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
```

Please note that the wildcard route parameter must be named `path` as expected by the adapter implementation.

The API router handler takes the following options to initialize:

-   getClient (required)

    <blockquote>(event: RequestEvent) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

#### Server Hooks

> **Warning**

The server hooks method is deprecated and will be removed in a future release. Use API routes instead.

You can mount the API by creating SvelteKit [server hooks](https://svelte.dev/tutorial/kit/handle) like:

```ts title='/src/hooks.server.ts'
import { SvelteKitHandler } from '@zenstackhq/server/sveltekit';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { db } from '~/db';
import { schema } from '~/zenstack/schema';

export const handle = SvelteKitHandler({
    apiHandler: new RPCApiHandler({ schema }),
    prefix: '/api/model',
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (event) => db.$setAuth(getSessionUser(event)),
});
```

> **Tip**

You can use the [sequence helper](https://svelte.dev/docs/kit/@sveltejs-kit-hooks#sequence) to compose multiple server hooks.

The hooks handler takes the following options to initialize:

- prefix

    <blockquote>string</blockquote>

    Prefix for the mounted API endpoints. E.g.: /api/model.

-   getClient (required)

    <blockquote>(event: RequestEvent) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
