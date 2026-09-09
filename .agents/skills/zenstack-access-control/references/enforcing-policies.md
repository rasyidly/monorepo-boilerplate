# Querying with Access Control

After defining access control policies in ZModel, it's time to enjoy their benefits.

## Installing Runtime Plugin

Similar to the schema side, access control's runtime aspect is encapsulated in the `@zenstackhq/plugin-policy` package too, as a Runtime Plugin (more about this topic [later](../plugins/index.md)). You should install it on the raw ORM client to get a new client instance with access control enforcement.

```ts
import { ZenStackClient } from '@zenstackhq/orm';
import { PolicyPlugin } from '@zenstackhq/plugin-policy';

// create an unprotected, "raw" ORM client
const db = new ZenStackClient(...);

// install the policy plugin
const authDb = db.$use(new PolicyPlugin());

// make queries with `authDb` to have access control enforced
...
```

> **Info**

`ZenStackClient` instances are immutable. Methods like `$use()` and `$setAuth()` return new client instances, leaving the original instance unchanged.

The new instances are shallow clone of the original one. They are cheap to create and don't involve creating new database connections.

## Setting Auth User

As mentioned in the previous part, you can use the `auth()` function in policy rules to refer to the current authenticated user. At runtime, you should use the `$setAuth()` API to provide such information. ZenStack itself is not an authentication library, so you need to determine how to achieve it based on your authentication mechanism.

In a web application, the typical pattern is to inspect the incoming request, extract and validate the user information from it, and then call `$setAuth()` to get an ORM client bound to that user.

```ts
import { getSessionUser } from './auth'; // your auth helper
import { authDb } from './db'; // the client with policy plugin installed

async function handleRequest(req: Request) {
    const user = await getSessionUser(req);

    // create an user-bound client
    const userDb = authDb.$setAuth(user);

    // make queries with `userDb` to make user-bound queries
    ...
}
```

Without calling `$setAuth()`, the client works in anonymous mode, meaning that `auth()` in ZModel is evaluated to `null`. You can explicitly call `$setAuth(undefined)` to get an anonymous-bound client from a client that's previously bound to a user.

Use the `$auth` property to get the user info previously set by `$setAuth()`.

> **Tip**

See [Integrating With Authentication](/docs/category/integrating-with-authentication) for guides on integrating ZenStack with popular authentication solutions.

## Making Queries

Access control policies are effective for both the ORM API and the query-builder API. To understand its behavior, the simplest mental model is to think that rows not satisfying the policies "don't exist".

### ORM Queries

For the most part, the ORM query behavior is very intuitive:

    - Read operations like `findMany`, `findUnique`, `count`, etc., only return/involve rows that meet the "read" policies.

    - Mutation operations that affect multiple rows, like `updateMany` and `deleteMany`, only impact rows that meet the "update" or "delete" policies respectively.

    - Mutation operations that affect a single, unique row, like `update` and `delete`, will throw an `ORMError` with `reason` set to `NOT_FOUND` if the target row doesn't meet the "update" or "delete" policies respectively. See [Errors](../errors) for more details.

> **Info**

Why set reason as `NOT_FOUND` instead of `REJECTED_BY_POLICY`? Because the rationale is rows that don't satisfy the policies "don't exist".

There are some complications when "read" and "write" policies affect the same query. It's ubiquitous because most mutation APIs involve reading the post-mutation entity to return to the caller. When the mutation succeeds but the post-mutation entity cannot be read, an `ORMError` with `reason` set to `REJECTED_BY_POLICY` is thrown, even though the mutation is persisted.

```ts
// if Post#1 is updatable but the post-update read is not allowed, the
// update will be persisted first and then an `ORMError`
// will be thrown
await db.post.update({
    where: { id: 1 },
    data: { published: false },
});
```

> **Info**

Why throw an error instead of returning `null`? Because it'll compromise type-safety. The `create`, `update`, and `delete` APIs don't have a nullable return type.

### Query-Builder Queries

The low-level Kysely query-builder API is also subject to access control enforcement. Its behavior is intuitive:

- Calling `$qb.selectFrom()` returns readable rows only.
- When you call `$qb.insertInto()`, an `ORMError` will be thrown if the inserted row doesn't satisfy the "create" policies. Similar for `update` and `delete`.
- Calling `$qb.update()` and `$qb.delete()` only affects rows that satisfy the "update" and "delete" policies, respectively.
- When you join tables, the joined table will be filtered to readable rows only.
- When you use sub-queries, the sub-queries will be filtered to readable rows only.

## Limitations

Here are some **IMPORTANT LIMITATIONS** about access control enforcement:

1. Mutations caused by cascade deletes/updates and database triggers are entirely internal to the database, so ZenStack cannot enforce access control on them.
2. Raw SQL queries executed via `$executeRaw()` and `$queryRaw()` are not subject to access control enforcement.
3. Similarly, raw queries made with query-builder API using the `sql` tag are not subject to access control enforcement.

## Samples

**`basic/zenstack/schema.zmodel`**

```zmodel
datasource db {
    provider = 'sqlite'
}

plugin policy {
    provider = '@zenstackhq/plugin-policy'
}

model User {
    id       Int    @id @default(autoincrement())
    email    String @unique
    posts    Post[]

    @@allow('create,read', true)
}

model Post {
    id        Int      @id @default(autoincrement())
    title     String
    published Boolean  @default(false)
    author    User?    @relation(fields: [authorId], references: [id])
    authorId  Int?

    @@deny('all', auth() == null)
    @@allow('read', published)
    @@allow('all', auth() == author)
}
```

**`basic/main.ts`**

```typescript
import { PolicyPlugin } from '@zenstackhq/plugin-policy';
import { createClient } from '../db';
import { schema } from './zenstack/schema';

async function main() {
  const db = await createClient(schema);

  // create users and posts with raw client
  const alice = await db.user.create({
    data: {
      email: 'alice@example.com',
      posts: {
        create: [
          { title: 'Alice Draft Post', published: false },
          { title: 'Alice Published Post', published: true }
        ]
      }
    }
  });

  const bob = await db.user.create({
    data: {
      email: 'bob@example.com',
      posts: {
        create: [{ title: 'Bob Draft Post', published: false }]
      }
    }
  });

  // install policy plugin
  const authDb = db.$use(new PolicyPlugin());

  // create user-bound clients
  const aliceDb = authDb.$setAuth(alice);
  const bobDb = authDb.$setAuth(bob);

  // query posts as Alice
  console.log('Alice sees posts:');
  console.table(
    await aliceDb.post.findMany({
      select: { title: true, published: true }
    })
  );

  // query posts as Bob
  console.log('Bob sees posts:');
  console.table(
    await bobDb.post.findMany({
      select: { title: true, published: true }
    })
  );
}

main();
```

## Implementation Notes

ZenStack v3's ORM is built on top of Kysely. Regardless of whether you use the ORM API or the query-builder one, queries are eventually transformed into Kysely's SQL AST and then compiled down to SQL and sent to the database for execution. The access control enforcement is implemented by transforming the AST and injecting proper filters.
