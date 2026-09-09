# Post-Update Rules

> **Info**

In ZenStack v2, post-update rules were implicitly defined with the "update" operation by using the `future()` function to refer to the post-update values. We found this approach to be unclean and error-prone. V3 made a breaking change to introduce a separate "post-update" operation.

## Overview

Among the CRUD operations, "update" is a special one because it has a "pre" state and "post" state. The "update" policies we've seen in the previous parts refer to the "pre" state, meaning that if your policies refer to the model's fields, the fields are evaluated to their values before the update happens.

However, sometimes you want to express conditions that should hold after the update happens. For example, you may want to ensure that after an update, a post's `published` field cannot be `true` unless the current user is the author. Post-update policies are designed for such scenarios.

Writing post-update rules is essentially the same as writing regular "update" rules, except that fields will refer to their post-update values. You can use the built-in `before()` function to refer to the pre-update entity if needed.

Another key difference is that "post-update" operation is by default allowed. If you don't write any post-update rules, the update operation will succeed as long as it passes the "update" policies. However, if you have any post-update rules for a model, at least one `@@allow` rule must evaluate to true for the update operation to succeed.

```zmodel
model Post {
    id        Int @id @default(autoincrement())
    title     String
    published Boolean @default(false)
    author    User @relation(fields: [authorId], references: [id])
    authorId  Int

    // only author can publish the post
    @@deny('post-update', published == true && auth().id != authorId)

    // prevent changing authorId
    @@deny('post-update', before().authorId != authorId)
}
```

When post-update policies are violated, an `ORMError` with `reason` set to "rejected-by-policy" is thrown. See [Errors](../errors) for more details.

## Samples

**`post-update/zenstack/schema.zmodel`**

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

    @@allow('all', true)
}

model Post {
    id        Int      @id @default(autoincrement())
    title     String
    published Boolean  @default(false)
    author    User?    @relation(fields: [authorId], references: [id])
    authorId  Int?

    @@allow('all', true)

    // deny publishing if not the author
    @@deny('post-update', published && auth().id != authorId)

    // prevent changing authorId on update
    @@deny('post-update', authorId != before().authorId)
}
```

**`post-update/main.ts`**

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
          { id: 1, title: 'Alice Draft Post', published: false },
          { id: 2, title: 'Alice Published Post', published: true }
        ]
      }
    }
  });

  const bob = await db.user.create({
    data: {
      email: 'bob@example.com'
    }
  });

  // install policy plugin
  const authDb = db.$use(new PolicyPlugin());

  // create user-bound clients
  const bobDb = authDb.$setAuth(bob);

  // update Alice's post as Bob (should fail)
  try {
    await bobDb.post.update({
      where: { id: 1 },
      data: { published: true }
    });
  } catch (e) {
    console.error(`Got expected post-update error: ${e}`);
  }

  // change authorId (should fail)
  try {
    await bobDb.post.update({
      where: { id: 1 },
      data: { authorId: bob.id }
    });
  } catch (e) {
    console.error(`Got expected post-update error: ${e}`);
  }
}

main();
```
