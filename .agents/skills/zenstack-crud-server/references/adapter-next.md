---
title: Next.js
description: Adapter for integrating with Next.js
---

# Next.js Adapter

<p>The <code>@zenstackhq/server/next</code> module provides a quick way to install a full set of CRUD API onto <a href=https://nextjs.org/  target="_blank">Next.js</a> apps. Combined with ZenStack's powerful access policies, you can achieve a secure data backend without manually coding it.</p>

The server adapter supports both the traditional "pages" router and the new "app" router.

### Installation

```bash
npm install @zenstackhq/server
```

### Mounting the API

You can use it to create a request handler in an API endpoint like:

**`App Router`**

```ts title='/src/app/api/model/[...path]/route.ts'
import type { NextRequest } from "next/server";
import { NextRequestHandler } from '@zenstackhq/server/next';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

const handler = NextRequestHandler({
    apiHandler: new RPCApiHandler({ schema }),
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (req: NextRequest) => client.$setAuth(getSessionUser(req)),
    useAppDir: true });

export {
  handler as GET,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
```

The Next.js API route handler takes the following options to initialize:

-   getClient (required)

    <blockquote>(req: NextRequest) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

**`Pages Router`**

```ts title='/src/pages/api/model/[...path].ts'
import type { NextApiRequest, NextApiResponse } from 'next';
import { NextRequestHandler } from '@zenstackhq/server/next';
import { RPCApiHandler } from '@zenstackhq/server/api';
import { getSessionUser } from '~/auth';
import { client } from '~/db';
import { schema } from '~/zenstack/schema';

export default NextRequestHandler({
    apiHandler: new RPCApiHandler({ schema }),
    // getSessionUser extracts the current session user from the request, its
    // implementation depends on your auth solution
    getClient: (req: NextApiRequest, res: NextApiResponse) => client.$setAuth(getSessionUser(req, res)),
});
```

The Next.js API route handler takes the following options to initialize:

-   getClient (required)

    <blockquote>(req: NextApiRequest, res: NextApiResponse) => ClientContract<Schema> | Promise<ClientContract<Schema>></blockquote>

    A callback for getting a ZenStackClient instance for talking to the database. Usually you'll return a client instance with access policy enabled and user identity bound.

-   apiHandler (required)

    <blockquote>ApiHandler</blockquote>

    The [API handler](../../service/api-handler/) instance that determines the API specification.

### Controlling what endpoints to expose

You can use a [Next.js middleware](https://nextjs.org/docs/pages/building-your-application/routing/middleware) to further control what endpoints to expose. For example, if you're using a RESTful API handler installed at "/api/model", you can disallow listing all `User` entities by adding a middleware like:

```ts title='/src/middleware.ts'
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const url = new URL(request.url);
    if (
        request.method === 'GET' &&
        url.pathname.match(/^\/api\/model\/user\/?$/)
    ) {
        return NextResponse.json({ error: 'Not allowed' }, { status: 405 });
    }
}

export const config = {
    matcher: '/api/model/:path*',
};
```

### Error Handling

Refer to the specific sections for [RPC Handler](../../service/api-handler/rpc#http-status-code-and-error-responses) and [RESTful Handler](../../service/api-handler/rest#error-handling).
