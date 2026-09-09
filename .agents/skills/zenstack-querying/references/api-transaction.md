---
description: Transaction API
---

# Transaction

You can use the `$transaction` method to run multiple operations in a transaction. There are two overloads of this method:

## Sequential Transaction

This overload takes an array of promises as input. The operations are executed sequentially in the order they are provided. The operations are independent of each other, because there's no way to access the result of a previous operation and use it to influence the later operations.

```ts
// Note that the `db.user.create` and `db.post.create` calls are not awaited. They
// are passed to the `$transaction` method to execute.
const [user, post] = await db.$transaction([
  db.user.create({ data: { name: 'Alice' } }),
  db.user.create({ data: { name: 'Bob' } }),
]);
```

The result of each operation is returned in the same order as the input.

> **Info**

Promises returned by the ORM APIs like `create`, `update`, etc. are lazy and do not start executing until they are awaited directly or the parent `$transaction` call is awaited.

## Interactive Transaction

This overload takes an async callback function as input. The callback receives a transaction client that can be used to perform database operations within the transaction.

Interactive transactions allows you to write imperative code that can access the results of previous operations and use them to influence later operations. Albeit it's flexibility, you should make the transaction callback run as fast as possible so as to reduce the performance impact of the transaction on the database.

```ts
const [user, post] = await db.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { name: 'Alice' } });
  const post = await tx.post.create({ data: { title: 'Hello World', authorId: user.id } });
  return [user, post];
});
```

## Samples

**`transaction.ts`**

```typescript
import { createClient } from './db';

async function main() {
  const db = await createClient();

  console.log('Create two users with a sequential transaction');
  const users = await db.$transaction([
    db.user.create({ data: { email: 'u1@test.com' } }),
    db.user.create({ data: { email: 'u2@test.com' } })
  ]);
  console.log(users);

  console.log('Create two users with unique constraint violation');
  try {
    await db.$transaction([
      db.user.create({ data: { email: 'u3@test.com' } }),
      db.user.create({ data: { email: 'u3@test.com' } })
    ]);
  } catch (err: any) {
    console.log('Transaction rolled back due to:', err.cause.message);
    // the following should log: "User created: null"
    console.log('User created:', await db.user.findUnique({ where: { email: 'u3@test.com' } }));
  }

  console.log('Create user and post with an interactive transaction');
  const [user, post] = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email: 'u3@test.com' } });
    const post = await tx.post.create({ data: { title: 'Post1', authorId: user.id } });
    return [user, post];
  });
  console.log('Created user and post:', user, post);
}

main();
```
