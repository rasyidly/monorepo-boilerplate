---
description: Creating a database client
---

# Database Client

> **🔋 ZenStack vs Prisma**

Unlike Prisma, ZenStack doesn't bundle any database driver. You're responsible for installing a compatible one. Also it doesn't read database connection string from the schema. Instead, you pass in the connection information when creating the client.

The `zen generate` command compiles the ZModel schema into TypeScript code, which we can in turn use to initialize a type-safe database client. ZenStack uses Kysely to handle the low-level database operations, so the client is initialize with a [Kysely dialect](https://kysely.dev/docs/dialects) - an object that encapsulates database details. For convenience, a few commonly used Kysely dialects (e.g., SqliteDialect and PostgresDialect) are reexported from `@zenstackhq/orm/dialects`.

The samples below show creating a client using SQLite (via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)) and PostgreSQL (via [node-postgres](https://github.com/brianc/node-postgres)). You can also use any other Kysely dialects for these two types of databases.

**`SQLite`**

```bash
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3
```

```ts title='db.ts'
import { ZenStackClient } from '@zenstackhq/orm';
import { SqliteDialect } from '@zenstackhq/orm/dialects/sqlite';
import SQLite from 'better-sqlite3';
import { schema } from './zenstack/schema';

export const db = new ZenStackClient(schema, {
    dialect: new SqliteDialect({
        database: new SQLite(':memory:'),
    }),
});
```

**`PostgreSQL`**

```bash
npm install pg
npm install --save-dev @types/pg
```

```ts title='db.ts'
import { ZenStackClient } from '@zenstackhq/orm';
import { PostgresDialect } from '@zenstackhq/orm/dialects/postgres';
import { schema } from './zenstack/schema';
import { Pool } from 'pg';

export const db = new ZenStackClient(schema, {
    dialect: new PostgresDialect({
        pool: new Pool({
            connectionString: process.env.DATABASE_URL,
        }),
    }),
});
```

**`MySQL`**

```bash
npm install mysql2
```

```ts title='db.ts'
import { ZenStackClient } from '@zenstackhq/orm';
import { MysqlDialect } from '@zenstackhq/orm/dialects/mysql';
import { schema } from './zenstack/schema';
import { createPool } from 'mysql2';

export const db = new ZenStackClient(schema, {
    dialect: new MysqlDialect({
        pool: createPool(process.env.DATABASE_URL),
    }),
});
```

The created `db` object has the full ORM API inferred from the type of the `schema` parameter. When necessary, you can also explicitly get the inferred client type like:

```ts
import type { ClientContract } from '@zenstackhq/orm';
import type { SchemaType } from '@/zenstack/schema';

export type DbClient = ClientContract<SchemaType>;
```
