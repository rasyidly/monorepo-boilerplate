---
title: Fastify
description: Adapter for integrating with Fastify
---

# Fastify Adapter

<p>The <code>@zenstackhq/server/fastify</code> module provides a quick way to install a full set of CRUD API onto <a href=https://www.fastify.io/  target="_blank">Fastify</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can integrate ZenStack into your project with the `ZenStackFastifyPlugin` [fastify plugin](https://www.fastify.io/docs/latest/Reference/Plugins/):

```ts
import fastify from 'fastify'
import { ZenStackFastifyPlugin } from '@zenstackhq/server/fastify';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const server = fastify();

server.register(ZenStackFastifyPlugin, {
    apiHandler: new RPCApiHandler({ schema }),
    prefix: '/api/model',
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (request) => client.$setAuth(getSessionUser(request)),
});
```

The Fastify adapter takes the following options to initialize:

- prefix

    <blockquote>string</blockquote>

    Prefix for the mounted API endpoints. E.g.: /api/model.

-   getClient (required)

    <blockquote>(request: FastifyRequest, reply: FastifyReply) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
