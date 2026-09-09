---
description: Count API
---

# Count

You can use the `count` method to count the number of records that match a query. It also allows to count non-null field values with an `select` clause.

**`count.ts`**

```typescript
import { createClient } from './db';
import { createUsersAndPosts } from './utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  console.log('Count all posts');
  console.log(await db.post.count());

  console.log('Count published posts');
  console.log(await db.post.count({ where: { published: true } }));

  console.log('Count post fields');
  console.log(
    await db.post.count({
      select: {
        _all: true, // count all records
        content: true // count non-null values
      }
    })
  );
}

main();
```

To count relations, please use a `find` API with the special `_count` field as demonstrated in the [Find](./find.md#field-selection) documentation.
