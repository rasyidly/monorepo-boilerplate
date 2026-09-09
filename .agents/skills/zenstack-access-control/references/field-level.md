# Field-Level Policies

> **Available since v3.2.0**

> **Preview Feature**

Field-level policy is in preview and may be subject to breaking changes in future releases.

Field-level policies allow you to define access control rules at the individual field level within a model. This provides fine-grained control over who can read or write specific fields in your data models. To define field-level policies, use the `@allow` and `@deny` attributes directly on model fields (note the single `@`).

```zmodel
model User {
    id    Int    @id

    // email can be updated only by the user themselves
    email String @allow('update', auth() == this)

    // name cannot be read by anonymous users
    name  String @deny('read', auth() == null)
}
```

Field-level policies are similar to model-level ones, with the following key restrictions:

- Only "read" and "update" operations are supported. You can use "all" to denote both.
- They cannot be defined on relation fields or computed fields.

## Read Behavior

When reading a row, fields that violates "read" policies will be nullified in the result. Conceptually, the following form of SQL is generated to guard the fields:

```sql
SELECT
    CASE WHEN <read_policy_for_field_1> THEN field_1 ELSE NULL END AS field_1,
    ...
FROM table
WHERE <model_level_policies> and <other_conditions>;
```

If read policies are defined on foreign key fields, they will also control the readability of the corresponding relations.

> **Info**

Setting unreadable fields null brings a caveat that you cannot tell whether a field is actually `NULL` in the database or just unreadable due to access control. So why don't we instead omit the fields from the result?

The concern is that a non-readable field should still have a valid SQL value, because it can be used to compute other data (computed columns, joins, etc.). With `null` values, the computation remain valid in SQL (e.g., `NULL + 1` results in `NULL`), so the fields remain usable everywhere even though their actual values cannot be seen.

## Update Behavior

When updating data, if an update involves setting fields that violate "update" policies, the entire update operation will be rejected with an `ORMError` with `reason` set to `REJECTED_BY_POLICY`.

## Samples

**`field-level/zenstack/schema.zmodel`**

```zmodel
datasource db {
    provider = 'sqlite'
}

plugin policy {
    provider = '@zenstackhq/plugin-policy'
}

model User {
    id    Int    @id @default(autoincrement())
    email String @unique
    posts Post[]

    @@allow('all', true)
}

model Post {
    id        Int     @id @default(autoincrement())
    title     String  @allow('read', published) @allow('update', auth() == author)
    published Boolean @default(false)
    author    User?   @relation(fields: [authorId], references: [id])
    authorId  Int?

    @@allow('all', true)
}
```

**`field-level/main.ts`**

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
          { id: 1, title: 'Alice Published Post', published: true },
          { id: 2, title: 'Alice Draft Post', published: false }
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
  const aliceDb = authDb.$setAuth(alice);
  const bobDb = authDb.$setAuth(bob);

  // query posts as Alice, only published posts' titles are visible
  console.log('Alice sees posts:');
  console.table(await aliceDb.post.findMany());

  // updating title with Bob should fail
  try {
    await bobDb.post.update({
      where: { id: 1 },
      data: { title: 'Hacked Title' }
    });
  } catch (err) {
    console.log(`Bob failed to update post title as expected, ${err}`);
  }

  // updating title with Alice should succeed
  const updated = await aliceDb.post.update({
    where: { id: 1 },
    data: { title: 'Alice Updated Post' }
  });
  console.log('Alice successfully updated her post title.');
  console.table(updated);
}

main();
```
