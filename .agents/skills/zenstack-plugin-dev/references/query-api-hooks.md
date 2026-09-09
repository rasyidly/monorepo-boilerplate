# Query API Hooks

> **Preview Feature**

Plugin feature is in preview and may be subject to breaking changes in future releases.

## Introduction

Query API hooks allow you to intercept ORM queries, like `create`, `findUnique`, etc. You can execute arbitrary code before or after the query operation, modify query args, or even block the operation altogether.

To create a query API hook plugin, call the `$use` method with an object with the `onQuery` key providing a callback. The callback is invoked with an argument containing the following fields:

- The model
- The operation
- The query args
- The ORM client that triggered the query
- A "proceed query" function, which you can call to continue executing the operation

As its name suggests, query API hooks are only triggered by ORM query calls, not by query builder API calls.

## Samples

**`plugins/query-api-hooks.ts`**

```typescript
import { definePlugin } from '@zenstackhq/orm';
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

async function main() {
  const db = await createClient();

  // intercept all models and all operations
  const db1 = db.$use(
    definePlugin({
      id: 'cost-logger',
      onQuery: async ({ model, operation, args, proceed }) => {
        const start = Date.now();
        const result = await proceed(args);
        console.log(`[cost] ${model} ${operation} took ${Date.now() - start}ms`);
        return result;
      }
    })
  );

  await createUsersAndPosts(db1);

  // modify query args
  const db2 = db.$use(
    definePlugin({
      id: 'viewCount-incrementer',
      onQuery: async ({ args, proceed }) => {
        const argsObj = args as any;
        const updatedArgs = {
          ...argsObj,
          data: {
            ...argsObj.data,
            viewCount: 10
          }
        };
        return proceed(updatedArgs);
      }
    })
  );
  console.log('Post created with incremented viewCount');
  console.log(await db2.post.create({ data: { title: 'New Post' } }));
}

main();
```
