---
description: Update API
---

# Update

Update to records can be done with the following methods:

- `update` - Update a single, unique record.
- `updateMany` - Update multiple records that match the query criteria.
- `updateManyAndReturn` - Similar to `updateMany`, but returns the updated records.
- `upsert` - Update a single, unique record, or create it if it does not exist.

## Updating scalar fields

**`update/scalar.ts`**

```typescript
import { createClient } from '../db';
import { createUsersAndPosts } from '../utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  // update a unique post
  console.log('Update post #1');
  console.log(
    await db.post.update({
      where: { id: 1 },
      data: { title: 'New Post' }
    })
  );

  // update many posts matching a condition
  console.log('Update all published posts');
  console.log(
    await db.post.updateMany({
      where: { published: true },
      data: { published: false }
    })
  );

  // you can limit the number of records to update
  console.log('Update at most 2 records');
  console.log(
    await db.post.updateMany({
      data: { published: true },
      limit: 2
    })
  );

  // numeric fields support incremental update
  console.log('Increment viewCount');
  console.log(
    await db.post.updateManyAndReturn({
      data: { viewCount: { increment: 1 } },
      select: { title: true, viewCount: true }
    })
  );

  // upsert
  console.log('Upsert updates when the record exists');
  console.log(
    await db.post.upsert({
      where: { id: 1 },
      update: { title: 'Wonderful Post' },
      create: { id: 1, title: 'One More Post' }
    })
  );

  // upsert
  console.log('Upsert creates when the record is not found');
  console.log(
    await db.post.upsert({
      where: { id: 5 },
      update: { title: 'Wonderful Post' },
      create: { id: 5, title: 'One More Post' }
    })
  );
}

main();
```

In additional to the standard way of updating fields, list fields support the following operators:

- `push`: Append a value or a list of values to the end of the list.
- `set`: Replace the entire list with a new list (equivalent to setting the field directly).

```ts
await db.post.update({
  where: { id: '1' },
  data: {
    topics: { push: 'webdev'},
  },
});

await db.post.update({
  where: { id: '1' },
  data: {
    topics: { set: ['orm', 'typescript'] },
  },
});
```

## Manipulating relations

The `update` and `upsert` methods are very powerful in that they allow you to freely manipulate relations. You can create, connect, disconnect, update, and delete relations in a single operation. You can also reach deeply into indirect relations. Nested updates are executed in a transaction to ensure data integrity.

`updateMany` and `updateManyAndReturn` only support updating scalar fields.

**`update/relation.ts`**

```typescript
import { createClient } from '../db';

async function main() {
  const db = await createClient();

  const user = await db.user.create({
    data: { email: 'u1@test.com' }
  });

  // create a related entity
  console.log('Update user and create a new post');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: { posts: { create: { id: 1, title: 'Post1' } } },
      include: { posts: { select: { id: true, title: true } } }
    })
  );

  console.log('Update user and connect an existing post');
  // create an detached post
  const post2 = await db.post.create({ data: { title: 'Post2' } });
  // connect to the user
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: { posts: { connect: { id: post2.id } } },
      include: { posts: { select: { id: true, title: true } } }
    })
  );

  // disconnect a connected entity
  console.log('Update user and disconnect a post');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: { posts: { disconnect: { id: post2.id } } },
      include: { posts: { select: { id: true, title: true } } }
    })
  );

  // update relation's fields
  console.log('Update user and change fields of a related post');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: {
        posts: {
          update: {
            where: { id: 1 },
            data: { title: 'Updated Post' }
          }
        }
      },
      include: { posts: { select: { id: true, title: true } } }
    })
  );

  // delete a related entity
  console.log('Update user and delete a related post');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: { posts: { delete: { id: 1 } } },
      include: { posts: { select: { id: true, title: true } } }
    })
  );

  // upsert a relation
  console.log('Update user and upsert a post');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: {
        posts: {
          upsert: {
            where: { id: 1 },
            create: { id: 1, title: 'Post1' },
            update: { title: 'Nother Post' }
          }
        }
      },
      include: { posts: { select: { id: true, title: true } } }
    })
  );
}

main();
```
