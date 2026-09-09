---
description: Aggregate API
---

# Aggregate

The `aggregate` method allows you to conduct multiple aggregations on a set of records with one operation. The supported aggregations are:

- `_count` - equivalent to the [Count API](./count.md).
- `_sum` - sum of a numeric field.
- `_avg` - average of a numeric field.
- `_min` - minimum value of a field.
- `_max` - maximum value of a field.

You can also use `where`, `orderBy`, `skip`, and `take` to control what records are included in the aggregation.

## Samples

**`aggregate.ts`**

```typescript
import { createClient } from './db';
import { createUsersAndPosts } from './utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  console.log(
    await db.post.aggregate({
      where: { published: false },
      // you can also use `count: true` to simply count all rows
      _count: { _all: true, content: true },
      _avg: { viewCount: true },
      _max: { viewCount: true }
    })
  );
}

main();
```
