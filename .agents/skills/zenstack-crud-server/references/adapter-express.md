---
title: Express.js
description: Adapter for integrating with Express.js
---

# Express.js Adapter

<p>The <code>@zenstackhq/server/express</code> module provides a quick way to install a full set of CRUD API onto <a href=https://expressjs.com/  target="_blank">Express.js</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can integrate ZenStack into your project with the `ZenStackMiddleware` [express middleware](https://expressjs.com/en/guide/using-middleware.html):

```ts
import express from 'express';
import { ZenStackMiddleware } from '@zenstackhq/server/express';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const app = express();

app.use(express.json());

app.use(
    '/api/model',
    ZenStackMiddleware({
        apiHandler: new RPCApiHandler({ schema }),
        // getSessionUser extracts the current session user from the request, its
        // implementation depends on your auth solution
        getClient: (request) => client.$setAuth(getSessionUser(request)),
    })
);
```

The Express.js adapter takes the following options to initialize:

-   getClient (required)

    <blockquote>(request: Request, response: Response) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

- sendResponse (optional)

    <blockquote>boolean</blockquote>

    Controls if the middleware directly sends a response. If set to false, the response is stored in the `res.locals` object and then the middleware calls the `next()` function to pass the control to the next middleware. Subsequent middleware or request handlers need to make sure to send a response.

    Defaults to `true`.

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
