---
description: Find API
---

# Find

The `find` series of APIs are used to query records from the database. It has the following methods:

- `findMany`

    Find multiple records that match the query criteria.

- `findUnique`

    Find a single record with a unique criteria.

- `findFirst`

    Find the first record that matches the query criteria.

- `findUniqueOrThrow`

    Similar to `findUnique`, but throws an error if no record is found.

- `findFirstOrThrow`

    Similar to `findFirst`, but throws an error if no record is found.

- `exists`

    > **Available since 3.2.0**

    Check if any record exists that matches the query criteria. More performant than using `findFirst` or `count`.

## Basic usage

**`find/basic.ts`**

```typescript
import { ORMError } from '@zenstackhq/orm';
import { createClient } from '../db';
import { createPosts } from '../utils';

// basic find demo
async function main() {
  const db = await createClient();

  // create some test posts
  await createPosts(db);

  // `findMany` reads a list of entities
  console.log('Posts with viewCount > 0');
  console.log(await db.post.findMany({ where: { viewCount: { gt: 0 } } }));

  // `findUnique` takes unique criteria as input
  // e.g., you can use id field
  console.log('Unique post with id #1');
  console.log(await db.post.findUnique({ where: { id: 1 } }));

  // or any unique field
  console.log('Unique post with slug "post1"');
  console.log(await db.post.findUnique({ where: { slug: 'post1' } }));

  // `findFirst` accepts arbitrary filter conditions that don't have
  // to be unique
  console.log('A published post');
  console.log(await db.post.findFirst({ where: { published: true } }));

  // `findUniqueOrThrow` and `findFirstOrThrow` throws an error if
  // no entity is found
  try {
    await db.post.findUniqueOrThrow({ where: { id: 3 } });
  } catch (err) {
    console.log('Got an expected error:', (err as ORMError).message);
  }
}

main();
```

## Filtering

The API provides a very flexible set of filtering options. We've put it into a [dedicated document](./filter.md).

## Sorting

Use the `orderBy` field to control the sort field, direction, and null field placement. Sorting is not supported for `findUnique` and `findUniqueOrThrow`.

**`find/sort.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

// sort demo
async function main() {
  const db = await createClient();

  // create some test posts
  await createUsersAndPosts(db);

  // sort by a simple field and direction
  console.log('Posts sorted by viewCount asc');
  console.log(
    await db.post.findMany({
      orderBy: { viewCount: 'asc' },
      select: { title: true, viewCount: true }
    })
  );

  // sort by multiple fields
  console.log('Posts sorted by published asc, viewCount desc');
  console.log(
    await db.post.findMany({
      orderBy: { published: 'asc', viewCount: 'desc' },
      select: { title: true, published: true, viewCount: true }
    })
  );

  // sort by a relation field
  console.log('Posts ordered by author email desc');
  console.log(
    await db.post.findMany({
      orderBy: { author: { email: 'desc' } },
      select: { title: true, author: { select: { email: true } } }
    })
  );

  // sort by the count of a to-many relation
  console.log('Users sorted by post count desc');
  console.log(
    await db.user.findMany({
      orderBy: { posts: { _count: 'desc' } },
      select: { email: true, _count: true }
    })
  );

  // sort and specify treatment of NULL values
  console.log('Posts sorted by authorId nulls first');
  console.log(
    await db.post.findMany({
      orderBy: { authorId: { sort: 'asc', nulls: 'first' } },
      select: { title: true, authorId: true }
    })
  );
}

main();
```

## Pagination

You can use two strategies for pagination: offset-based or cursor-based. Pagination is not supported for `findUnique` and `findUniqueOrThrow`.

**`find/pagination.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

// pagination demo
async function main() {
  const db = await createClient();

  // create some test posts
  await createUsersAndPosts(db);

  // use `skip` and `take` to fetch a page
  console.log('The 2nd and 3nd most viewed posts');
  console.log(
    await db.post.findMany({
      orderBy: { viewCount: 'desc' },
      skip: 1,
      take: 2
    })
  );

  // you can use negative `take` to fetch backward
  console.log('The top 2 most viewed posts');
  console.log(
    await db.post.findMany({
      orderBy: { viewCount: 'asc' },
      take: -2
    })
  );

  // use a cursor to locate a page, note the cursor item is included
  console.log('Find with cursor id=2, inclusive');
  console.log(
    await db.post.findMany({
      orderBy: { id: 'asc' },
      cursor: { id: 2 }
    })
  );

  // exclude the cursor with `skip`
  console.log('Find with cursor id=2, exclusive');
  console.log(
    await db.post.findMany({
      orderBy: { id: 'asc' },
      cursor: { id: 2 },
      skip: 1
    })
  );

  // cursor can contain multiple filters
  console.log('Find with cursor id=2 && slug="post2"');
  console.log(
    await db.post.findMany({
      orderBy: { id: 'asc' },
      cursor: { id: 2, slug: 'post2' },
      skip: 1
    })
  );
}

main();
```

## Field selection

You can use the following fields to control what fields are returned in the result:

- `select`

    An object specifying the fields to include in the result. Setting a field to `true` means to include it. If a field is a relation, you can provide an nested object to further specify which fields of the relation to include.

    This field is optional. If not provided, all non-relation fields are included by default. The `include` field is mutually exclusive with the `select` field.

- `include`

    An object specifying the relations to include in the result. Setting a relation to `true` means to include it. You can pass an object to further choose what fields/relations are included for the relation, and/or a `where` clause to filter the included relation records.

    This field is optional. If not provided, no relations are included by default. The `include` field is mutually exclusive with the `select` field.

- `omit`

    An object specifying the fields to omit from the result. Setting a field to `true` means to omit it. Only applicable to non-relation fields.

    This field is optional. If not provided, no fields are omitted by default. The `omit` field is mutually exclusive with the `select` field.

    See [Omitting Fields](./omit) for different ways to configure field omission.

**`find/selection.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

// field selection demo
async function main() {
  const db = await createClient();

  // create some test posts
  await createUsersAndPosts(db);

  // selecting fields
  console.log('Selecting fields: scalar and relation');
  console.log(
    await db.post.findFirst({
      select: { id: true, title: true, author: true }
    })
  );

  // omitting scalar fields
  console.log('Omitting scalar fields');
  console.log(
    await db.post.findFirst({
      omit: { viewCount: true, createdAt: true }
    })
  );

  // including relations (which selects all scalar fields as well)
  console.log('Including a relation');
  console.log(
    await db.post.findFirst({
      include: { author: true }
    })
  );

  // combining `include` and `omit`
  console.log('Combining include and omit');
  console.log(
    await db.post.findFirst({
      include: { author: true },
      omit: { viewCount: true, createdAt: true }
    })
  );

  // `select` and `include` are mutually exclusive
  try {
    // @ts-expect-error
    await db.post.findFirst({ select: { id: true }, include: { author: true } });
  } catch {}

  // `select` and `omit` are mutually exclusive
  try {
    // @ts-expect-error
    await db.post.findFirst({ select: { id: true }, omit: { title: true } });
  } catch {}

  // deep nested select
  console.log('Deep nested select');
  console.log(
    await db.user.findFirst({
      select: {
        email: true,
        posts: { select: { title: true } }
      }
    })
  );

  // selecting relation with filtering and sorting
  console.log('Selecting relation with filtering and sorting');
  console.log(
    await db.user.findFirst({
      select: {
        email: true,
        posts: {
          where: { published: true },
          orderBy: { viewCount: 'desc' }
        }
      }
    })
  );

  // if a model has to-many relations, you can select their counts
  console.log('Selecting counts for all to-many relations');
  console.log(
    await db.user.findFirst({
      select: {
        email: true,
        _count: true
      }
    })
  );

  // you can also select a specific relation's count
  console.log("Selecting a specific to-many relation's count");
  console.log(
    await db.user.findFirst({
      select: {
        email: true,
        _count: { select: { posts: true } }
      }
    })
  );
}

main();
```

## Finding distinct rows

You can use the `distinct` field to find distinct rows based on specific fields. One row for each unique combination of the specified fields will be returned. The implementation relies on SQL `DISTINCT ON`, so it's not available for SQLite and MySQL provider.

```ts
// returns one Post for each unique authorId
await db.post.findMany({ distinct: ['authorId'] });
```
