---
title: Hono
description: Adapter for integrating with Hono
---

# Hono Adapter

<p>The <code>@zenstackhq/server/hono</code> module provides a quick way to install a full set of CRUD API onto <a href=https://hono.dev/  target="_blank">Hono</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can use the `createHonoHandler` API to create a [Hono middleware](https://hono.dev/docs/getting-started/basic#using-middleware) that handles CRUD requests automatically:

```ts
import { Context, Hono } from 'hono';
import { createHonoHandler } from '@zenstackhq/server/hono';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const app = new Hono();

app.use(
    '/api/model/*',
    createHonoHandler({
        apiHandler: new RPCApiHandler({ schema }),
        // getSessionUser extracts the current session user from the request,
        // its implementation depends on your auth solution
        getClient: (ctx) => client.$setAuth(getSessionUser(ctx)),
    })
);
```

The middleware factory takes the following options to initialize:

-   getClient (required)

    <blockquote>(ctx: Context) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
