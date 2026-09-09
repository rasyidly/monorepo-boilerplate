---
description: Create API
---

# Create

The `create` series of APIs are used to create new records in the database. It has the following methods:

- `create`
    Create a single record, optionally with nested relations.
- `createMany`
    Create multiple records in a single operation. Nested relations are not supported. Only the number of records created is returned.
- `createManyAndReturn`
    Similar to `createMany`, but returns the created records.

Nested creates are executed in a transaction to ensure data integrity.

## Samples

**`create.ts`**

```typescript
import { createClient } from './db';

async function main() {
  const db = await createClient();

  // create a user with some posts
  const user1 = await db.user.create({
    data: {
      email: 'u1@test.com',
      posts: {
        create: [
          {
            title: 'Post1',
            content: 'My first post',
            published: false
          },
          {
            title: 'Post2',
            content: 'Just another post',
            published: true
          }
        ]
      }
    },
    // the `include` clause includes the relation in the
    // create result
    include: { posts: true }
  });

  // the created user together with the posts relation are returned
  console.log('User', user1.email, 'is created with posts', user1.posts);

  // you can also use the "select" clause to pick specific fields to return
  const user2 = await db.user.create({
    data: { email: 'u2@test.com' },
    select: { id: true }
  });
  // only "id" field is available
  console.log('New user created with id:', user2.id);

  // instead of creating nested relations, you can also use
  // the `connect` clause to connect to existing entities
  const newPost = await db.post.create({ data: { title: 'Post3', content: '' } });
  const user3 = await db.user.create({
    data: {
      email: 'u3@test.com',
      posts: { connect: { id: newPost.id } }
    },
    include: { posts: true }
  });
  console.log(
    `User#${user3.id} is connected to posts:`,
    user3.posts.map((p) => p.id)
  );

  // `createMany` allows you to batch create entities
  const result = await db.user.createMany({
    data: [{ email: 'u4@test.com' }, { email: 'u5@test.com' }]
  });
  // only the number of entites created will be returned
  console.log('Number of users created:', result.count);

  // `createManyAndReturn` is similar except that it returns
  // the created entities
  const newUsers = await db.user.createManyAndReturn({
    data: [{ email: 'u6@test.com' }, { email: 'u7@test.com' }]
  });
  console.log('Some more users created:', newUsers);

  // use the `skipDuplicates` flag to ignore items that violate
  // unique constraints
  const moreUsers = await db.user.createManyAndReturn({
    data: [{ email: 'u7@test.com' }, { email: 'u8@test.com' }],
    skipDuplicates: true
  });
  console.log('More users created:', moreUsers);
}

main();
```
