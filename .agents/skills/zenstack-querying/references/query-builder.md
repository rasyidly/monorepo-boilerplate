---
description: Query Builder API
---

# Query Builder API

> **🔋 ZenStack vs Prisma**

Query builder API is a major feature that sets ZenStack apart from Prisma.

The [Query API](./api/) introduced in the previous sections provide a powerful and intuitive way to query databases. However, complex applications usually have use cases that outgrow its capabilities. For typical ORMs, this is where you leave the comfort zone and resort to writing SQL.

The unique advantage of ZenStack is that it's built above [Kysely](https://kysely.dev) - a very popular type-safe SQL query builder. This means we can easily expose the full power of Kysely to you as a much better alternative to writing raw SQL.

No extra setup is needed to use the query builder API. The ORM client has a `$qb` property that provides the underlying Kysely query builder, and its typing is inferred from the ZModel schema. Refer to [Kysely documentation](https://kysely.dev/docs/intro) for details on how to use the API.

Besides building full queries, the query builder API can also be embedded inside the ORM query API with a `$expr` key inside a `where` clause. See [Filter](./api/filter.md) section for details.

## Samples

The samples assume you have a basic understanding of Kysely.

**`query-builder.ts`**

```typescript
import { createClient } from './db';

async function main() {
  const db = await createClient();

  console.log('Create a user');
  const user = await db.$qb
    .insertInto('User')
    .values({
      email: 'u1@test.com'
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  console.log(user);

  console.log('Create two posts for the user');
  console.log(
    await db.$qb
      .insertInto('Post')
      .values([
        { title: 'Post1', authorId: user.id, updatedAt: new Date().toISOString() },
        { title: 'Post2', authorId: user.id, updatedAt: new Date().toISOString() }
      ])
      .returningAll()
      .execute()
  );

  console.log('Find a user with at least two posts');
  // build a query equivalent to the following SQL:
  //   SELECT User.*, postCount FROM User LEFT JOIN
  //     (SELECT authorId, COUNT(*) AS postCount FROM Post GROUP BY authorId) AS UserPosts
  //   ON
  //     UserPosts.authorId = User.id
  //   WHERE
  //     postCount > 1
  const result = await db.$qb
    .selectFrom('User')
    .leftJoin(
      // express builder is type-safe
      eb => eb
        .selectFrom('Post')
        .select('authorId')
        .select(({fn}) => fn.countAll().as('postCount'))
        .groupBy('authorId')
        .as('UserPosts'),
      join => join.onRef('UserPosts.authorId', '=', 'User.id')
    )
    .selectAll('User')
    .select('postCount')
    .where('postCount', '>', 1)
    .executeTakeFirstOrThrow();
  // query result is type-safe
  console.log(`User ${result.email} has ${result.postCount} posts`);

  console.log('Use query builder inside filter');
  console.log(
    await db.user.findMany({
      where: {
        $expr: (eb) =>
          eb
            .selectFrom('Post')
            .select(eb => eb(eb.fn.countAll(), '>', 1).as('postCountFilter'))
            .whereRef('Post.authorId', '=', 'User.id')
      }
    })
  );
}

main();
```
