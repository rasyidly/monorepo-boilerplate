---
title: Nuxt
description: Adapter for integrating with Nuxt
---

# Nuxt Adapter

<p>The <code>@zenstackhq/server/nuxt</code> module provides a quick way to install a full set of CRUD API onto <a href=https://nuxt.com/  target="_blank">Nuxt</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can mount the API by creating a Nuxt server event handler like:

```ts title='/server/api/model/[...].ts'
import { createEventHandler } from '@zenstackhq/server/nuxt';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

export default createEventHandler({
    apiHandler: new RPCApiHandler({ schema }),
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (event) => client.$setAuth(getSessionUser(event)),
});
```

The Nuxt event handler takes the following options to initialize:

-   getClient (required)

    <blockquote>(event: H3Event<EventHandlerRequest>) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
