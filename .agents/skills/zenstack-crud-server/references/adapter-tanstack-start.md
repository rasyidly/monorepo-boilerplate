---
title: TanStack Start
description: Adapter for integrating with TanStack Start
---

# TanStack Start Adapter

[TanStack Start](https://tanstack.com/start) is a full-stack React framework powered by TanStack Router, offering full-document SSR, streaming, server functions, and bundling capabilities.

<p>The <code>@zenstackhq/server/tanstack-start</code> module provides a quick way to install a full set of CRUD API onto <a href=https://tanstack.com/start  target="_blank">TanStack Start</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

This feature is contributed by [@digoburigo](https://github.com/digoburigo).

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can use the `TanStackStartHandler` to create a handler for your API routes. TanStack Start uses file-based routing, so you'll typically create a catch-all route to handle all CRUD operations:

```ts title='app/routes/api/$.ts'
import { createFileRoute } from '@tanstack/react-router'
import { TanStackStartHandler } from '@zenstackhq/server/tanstack-start'
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const handler = TanStackStartHandler({
    apiHandler: new RPCApiHandler({ schema }),
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (request) => client.$setAuth(getSessionUser(request)),
})

export const Route = createFileRoute('/api/$')({
    server: {
        handlers: {
            GET: handler,
            POST: handler,
            PUT: handler,
            PATCH: handler,
            DELETE: handler,
        }
    }
})
```

The TanStack Start handler takes the following options to initialize:

-   getClient (required)

    <blockquote>(request: Request) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
