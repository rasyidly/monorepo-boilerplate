---
title: Elysia
description: Adapter for integrating with Elysia
---

# Elysia Adapter

<p>The <code>@zenstackhq/server/elysia</code> module provides a quick way to install a full set of CRUD API onto <a href=https://elysiajs.com  target="_blank">Elysia</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

This feature is contributed by [@rodrigoburigool](https://github.com/rodrigoburigool).

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can use the `createElysiaHandler` API to create an Elysia request handler that handles CRUD requests automatically:

```ts
import { Elysia, Context } from 'elysia';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { createElysiaHandler } from '@zenstackhq/server/elysia';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const app = new Elysia({ prefix: '/api' });

// install the CRUD middleware under route "/api/crud"
app.group('/crud', (app) =>
    app.use(
        createElysiaHandler({
            apiHandler: new RPCApiHandler({ schema }),
            basePath: '/api/model',
            // getSessionUser extracts the current session user from the request,
            // its implementation depends on your auth solution
            getClient: (context) => client.$setAuth(getSessionUser(context)),
        })
    )
);

function getCurrentUser(context: Context) {
    // the implementation depends on your authentication mechanism
    ...
}

app.listen(3000);
```

The middleware factory takes the following options to initialize:

-   getClient (required)

    <blockquote>(ctx: Context) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

- basePath (optional)

    <blockquote>string</blockquote>

    Optional base path to strip from the request path before passing to the API handler. E.g., if your CRUD handler is mounted at `/api/crud`, set this field to `'/api/crud'`.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
