---
description: how to filter entities
---

# Filter

Filtering is an important topic because it's involved in many ORM operations, for example when you find records, selecting relations, and updating or deleting multiple records.

## Basic filters

You can filter on scalar fields with values or operators as supported by the field type. The following filter operators are available.

- `equals` `not`: all scalar fields
- `in` `notIn`: all scalar fields
- `contains` `startsWith` `endsWith`: `String` fields
- `lt` `lte` `gt` `gte` `between`: `String`, `Int`, `BigInt`, `Float`, `Decimal`, and `Date` fields

A filter object can contain multiple field filters, and they are combined with `AND` semantic. You can also use the `AND`, `OR`, and `NOT` logical operators to combine filter objects to form a complex filter.

**`filter/basic.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  // value filters
  console.log('Post title is "Post1"');
  console.log(await db.post.findFirst({ where: { title: 'Post1' } }));

  // equality filters (equivalent to a value filter)
  console.log('Post title equals "Post1"');
  console.log(await db.post.findFirst({ where: { title: { equals: 'Post1' } } }));

  // string operators
  console.log('Post content starts with "Another"');
  console.log(await db.post.findFirst({ where: { content: { startsWith: 'Another' } } }));

  // numeric operators
  console.log('Post with viewCount > 1');
  console.log(await db.post.findFirst({ where: { viewCount: { gt: 1 } } }));

  // use "not" to negate a filter
  console.log('Post with not(viewCount > 1)');
  console.log(
    await db.post.findFirst({
      where: { viewCount: { not: { gt: 1 } } }
    })
  );

  // multile fields in a filter object has AND semantic
  console.log('Post with viewCount > 1 && title = "Post1"');
  console.log(await db.post.findFirst({ where: { viewCount: { gt: 1 }, title: 'Post1' } }));

  // use "in"/"notIn" to check if a field matches any item in a list
  console.log('Post with title in ["Post1, "Post2"]');
  console.log(await db.post.findFirst({ where: { title: { in: ['Post1', 'Post2'] } } }));

  // use AND/OR/NOT to build composite filters
  console.log('Post with: viewCount > 1 || (content startsWith "Another" && title != "Post1")');
  console.log(
    await db.post.findFirst({
      where: {
        OR: [
          { viewCount: { gt: 1 } },
          {
            AND: [{ content: { startsWith: 'Another' } }, { NOT: { title: 'Post1' } }]
          }
        ]
      }
    })
  );
}

main();
```

## List filters

List fields allow extra filter operators to filter on the list content:

- `has`: checks if the list contains a specific value.
- `hasEvery`: checks if the list contains all values in a given array.
- `hasSome`: checks if the list contains at least one value in a given array.
- `isEmpty`: checks if the list is empty.

> **Info**

List type is only supported by PostgreSQL.

```zmodel
model Post {
  ...
  topics String[]
}
```

```ts
await db.post.findMany({
  where: { topics: { has: 'webdev' } }
});

await db.post.findMany({
  where: { topics: { hasSome: ['webdev', 'typescript'] } }
});

await db.post.findMany({
  where: { topics: { hasEvery: ['webdev', 'typescript'] } }
});

await db.post.findMany({
  where: { topics: { isEmpty: true } }
});
```

## Json filters

> **Preview Feature**

Json filter is in preview and may be subject to breaking changes in future releases.

The query API supports flexible filtering on `Json` fields and allows you to reach into nested structures in the JSON data.

### Generic Json filters

Generic Json filters doesn't assume a predefined structure of the JSON data, and allows you to use JSON path to specify the location of the data you want to filter on. Such filters can be used on both plain `Json` and [Typed Json](../../modeling/typed-json) fields. The following fields can be used in the filter body (all fields are optional):

- `path`

    [JSON Path](https://datatracker.ietf.org/doc/rfc9535/) string for selecting data to filter on. If not provided, the root of the JSON data is used.

    > **🔋 ZenStack vs Prisma**

While for Prisma the "path" field's format depends on the database type, ZenStack unified it to a JSON path string.

- `equals`

    Checks if the selected data equals the given value. The value can be primitive types, arrays, or objects.

- `not`

    Checks if the selected data does not equal the given value. The value can be primitive types, arrays, or objects.

- `string_contains`, `string_starts_with`, `string_ends_with`

    String matching operators. If the selected data is not a string, the filter evaluates to false.

- `mode`

    Specifies if the string matching should be case sensitive or insensitive. Possible values are "default" (use default database behavior) and "insensitive" (case insensitive). Default is "default". Case insensitive matching is only supported on databases that support it natively (e.g., PostgreSQL).

- `array_contains`, `array_starts_with`, `array_ends_with`

    Array matching operators. If the selected data is not an array, the filter evaluates to false.

**`filter/json.ts`**

```typescript
import { createClient } from '../db';

async function main() {
  const db = await createClient();

  const profile = {
    gender: 'male',
    professions: ['engineer', 'consultant'],
    bio: 'typescript developer'
  };

  await db.user.create({
    data: {
      email: 'u1@test.com',
      profile
    }
  });

  console.log('Filter by toplevel JSON data');
  console.log(await db.user.findFirst({ where: { profile: { equals: profile } } }));

  console.log('Filter with JSON path selection');
  console.log(
    await db.user.findFirst({
      where: {
        profile: {
          path: '$.professions[0]',
          string_starts_with: 'eng'
        }
      }
    })
  );
}

main();
```

### Typed Json filters

[Strongly Typed Json](../../modeling/typed-json) fields, with their structure well defined in the schema, allow for a more convenient way to filter. Instead of using JSON path, you can directly use fields to build-up the filter, similar to how you would filter with relations.

> **Tip**

You can still use generic Json filters on Typed Json fields if needed.

**`filter.ts`**

```typescript
import { inspect } from 'node:util';
import { createClient } from './db';

async function main() {
  const db = await createClient();

  const user = await db.user.create({
    data: {
      email: 'u1@test.com',
      // "profile" is a typed JSON field
      profile: {
        age: 20,
        jobs: [
          { company: 'ZenStack', title: 'Developer' },
          { company: 'GitHub', title: 'DevRel' }
        ]
      }
    }
  });
  console.log(`User created: ${inspect(user, false, null)}\n`);

  // filter with typed fields
  console.log('Query users with profile.age > 18');
  const adults = await db.user.findMany({
    where: { profile: { age: { gt: 18 } } }
  });
  console.log(inspect(adults, false, null), '\n');

  // filter with typed array fields
  console.log('Query users who have had Dev related jobs');
  const zenstackDevs = await db.user.findMany({
    where: { profile: { jobs: { some: { title: { contains: 'Dev' } } } } }
  });
  console.log(inspect(zenstackDevs, false, null));
}

main();
```

## Text search filters

For text matching beyond exact and `LIKE`-style operators, ZenStack provides two text-search features — **full-text search** and **fuzzy search**. See the [Text Search](./text-search/index.md) documentation for details and guidance on when to use each.

## Relation filters

Filters can be defined on conditions over relations. For one-to-one relations, you can filter on their fields directly. For one-to-many relations, use the "some", "every", or "none" operators to build a condition over a list of records.

**`filter/relation.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  // filter by a one-to-one relation
  console.log('Post owned by u1');
  console.log(
    await db.post.findFirst({
      where: { author: { email: 'u1@test.com' } }
    })
  );

  // for optional relation, you can use null check to filter on if the relation
  // is connected
  console.log('Posts not owned by anyone');
  console.log(
    await db.post.findFirst({
      where: { author: null }
    })
  );

  // filter by a one-to-many relation using "some", "every", or "none" operator
  console.log('User with at least one published post');
  console.log(
    await db.user.findFirst({
      where: { posts: { some: { published: true } } }
    })
  );
}

main();
```

## Query builder filters

> **🔋 ZenStack vs Prisma**

The ability to mix SQL query builder into ORM filters is a major improvement over Prisma.

ZenStack v3 is implemented on top of [Kysely](https://kysely.dev/), and it leverages Kysely's powerful query builder API to extend the filtering capabilities. You can use the `$expr` operator to define a boolean expression that can express almost everything that can be expressed in SQL.

The `$expr` operator can be used together with other filter operators, so you can keep most of your filters simple and only reach down to the query builder level for complicated components.

**`filter/query-builder.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  console.log('Find users with at least two posts');
  console.log(
    await db.user.findMany({
      where: {
        $expr: (eb) =>
          // SELECT (COUNT(*) >= 2) FROM "Post" WHERE "Post"."id" = "User"."id"
          eb
            .selectFrom('Post')
            .whereRef('Post.authorId', '=', 'User.id')
            .select(({ fn }) => eb(fn.countAll(), '>=', 2).as('hasMorePosts'))
      }
    })
  );
}

main();
```
