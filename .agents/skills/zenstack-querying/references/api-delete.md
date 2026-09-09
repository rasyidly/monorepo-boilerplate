---
description: Delete API
---

# Delete

Deleting records can be done with the following methods:

- `delete` - Delete a single, unique record.
- `deleteMany` - Delete multiple records that match the query criteria.
- `deleteManyAndReturn` - Similar to `deleteMany`, but returns the deleted records

You can also delete records as part of an `update` operation from a relation. See [Manipulating relations](./update.md#manipulating-relations) for details.

## Samples

**`delete.ts`**

```typescript
import { createClient } from './db';
import { createUsersAndPosts } from './utils';

async function main() {
  const db = await createClient();
  await createUsersAndPosts(db);

  console.log('Delete a unique post');
  console.log(await db.post.delete({ where: { id: 1 } }));

  console.log('Delete many posts');
  console.log(await db.post.deleteMany({ where: { published: false } }));
}

main();
```
