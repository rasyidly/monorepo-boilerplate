# Kysely Query Hooks

> **Preview Feature**

Plugin feature is in preview and may be subject to breaking changes in future releases.

## Introduction

Kysely query hooks are the lowest level of interceptors in the plugin system. Since ZenStack eventually delegates all database access to Kysely, these hooks allow you to inspect and modify all SQL queries before they are sent to the database, regardless of whether they originate from the ORM query API or the query builder API.

This mechanism gives you great power to control the ORM's behavior entirely. One good example is the [Access Control](../access-control/) plugin - the access policy enforcement is entirely achieved via intercepting the Kysely queries.

To create a Kysely query hook plugin, call the `$use` method with an object containing a `onKyselyQuery` callback. The callback is triggered before each Kysely query is executed. It receives a context object containing:

- The Kysely instance
- The Kysely query node (SQL AST)
- The ORM client that triggered the query
- A "proceed query" function, which you can call to send the query to the database

## Samples

> **Info**

Kysely's `OperationNode` objects are low-level and not easy to process. [Kysely Plugin System](https://kysely.dev/docs/plugins) is a good information source for learning it. ZenStack will provide helpers to facilitate common tasks in the future.

**`plugins/kysely-query-hooks.ts`**

```typescript
import { createClient } from '../db';
import {
  SelectQueryNode,
  WhereNode,
  AndNode,
  BinaryOperationNode,
  ColumnNode,
  OperatorNode,
  ValueNode,
  TableNode
} from 'kysely';

async function main() {
  const db = await createClient();

  // inject a filter "viewCount > 0" when selecting from "Post" table
  const db1 = db.$use({
    id: 'viewCount-filter',
    onKyselyQuery: ({ query, proceed }) => {
      if (SelectQueryNode.is(query)) {
        // first make sure the query is selecting from "Post" table
        const from = query.from?.froms[0];
        if (from && TableNode.is(from) && from.table.identifier.name === 'Post') {
          // filter to inject: "viewCount > 0"
          const viewCountFilter = BinaryOperationNode.create(
            ColumnNode.create('viewCount'),
            OperatorNode.create('>'),
            ValueNode.create(0)
          );

          let updatedWhere: WhereNode;

          if (query.where) {
            // if the query already has a `where`, merge it with an AND
            updatedWhere = WhereNode.create(AndNode.create(query.where.where, viewCountFilter));
          } else {
            // otherwise just create a new `where`
            updatedWhere = WhereNode.create(viewCountFilter);
          }
          // reconstruct the query node with `where` replaced
          query = { ...query, where: updatedWhere };
        }
      }
      // execute the query
      return proceed(query);
    }
  });

  // creat two posts
  await db1.post.create({ data: { title: 'Post1', viewCount: 0 } });
  await db1.post.create({ data: { title: 'Post1', viewCount: 1 } });

  // only posts with viewCount > 0 are returned
  console.log('Find posts with injected filter');
  console.log(await db1.post.findMany());
}

main();
```
