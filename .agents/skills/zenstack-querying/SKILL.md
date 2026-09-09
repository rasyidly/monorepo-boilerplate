---
name: zenstack-querying
description: Query and mutate data with the ZenStack V3 client. Use when creating a ZenStackClient (SQLite/Postgres/MySQL dialect), using the Prisma-compatible ORM API (findMany/create/update/etc.), relation queries (select/include), computed fields, polymorphic models, strongly-typed JSON, data validation on writes (@email/@length/@@validate), transactions, the Kysely query-builder escape hatch ($qb / $expr), custom procedures, raw SQL, logging, or handling ORMError.
---

# ZenStack V3 — Querying

The ZenStack client exposes a **Prisma-compatible ORM API** for everyday queries plus a **Kysely
query builder** (`$qb`) for anything SQL-shaped that the ORM API can't express. Schema syntax is in
`zenstack-schema-modeling`; access control in `zenstack-access-control`.

## Creating the client

Import `ZenStackClient` from `@zenstackhq/orm`, pass the generated `schema` plus a Kysely `dialect`.
Install the matching driver yourself (see `zenstack-project-setup`).

**SQLite** (`better-sqlite3`):

```ts
import { ZenStackClient } from '@zenstackhq/orm';
import { SqliteDialect } from '@zenstackhq/orm/dialects/sqlite';
import SQLite from 'better-sqlite3';
import { schema } from './zenstack/schema';

export const db = new ZenStackClient(schema, {
    dialect: new SqliteDialect({ database: new SQLite('./dev.db') }),
});
```

**PostgreSQL** (`pg`):

```ts
import { ZenStackClient } from '@zenstackhq/orm';
import { PostgresDialect } from '@zenstackhq/orm/dialects/postgres';
import { schema } from './zenstack/schema';
import { Pool } from 'pg';

export const db = new ZenStackClient(schema, {
    dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
});
```

**MySQL** (`mysql2`):

```ts
import { MysqlDialect } from '@zenstackhq/orm/dialects/mysql';
import { createPool } from 'mysql2';

export const db = new ZenStackClient(schema, {
    dialect: new MysqlDialect({ pool: createPool(process.env.DATABASE_URL) }),
});
```

Types are fully inferred from the schema — no separate model imports needed for most code. When you
need an explicit type: `ClientContract<SchemaType>` for the client, or import generated `models` /
`input` types, or use the `ModelResult` generic from `@zenstackhq/orm` to compute a row type from a
given `select`/`include`.

To enforce access policies, wrap this client with the policy plugin — see
`zenstack-access-control`.

## ORM API

Model accessors live on the client (`db.user`, `db.post`, …). The API matches Prisma Client.

**Read**: `findMany`, `findUnique`, `findUniqueOrThrow`, `findFirst`, `findFirstOrThrow`,
`exists` (v3.2.0+, cheaper than `findFirst`/`count`), `count`, `aggregate`, `groupBy`.

```ts
const users = await db.user.findMany({
    where: { age: { gt: 18 }, email: { endsWith: '@acme.com' } },
    orderBy: { createdAt: 'desc' },
    skip: 0,
    take: 20,
});
const user = await db.user.findUnique({ where: { id: 1 } });
const n = await db.user.count({ where: { age: { gte: 18 } } });
```

**Filter operators**: `equals`, `not`, `in`, `notIn`, `contains`, `startsWith`, `endsWith`, `lt`,
`lte`, `gt`, `gte`, `between`; logical `AND`/`OR`/`NOT`; list `has`/`hasEvery`/`hasSome`/`isEmpty`
(Postgres). For to-many relations filter with `some`/`every`/`none`; for to-one, filter fields
directly.

**Aggregate / groupBy** support `_count`, `_sum`, `_avg`, `_min`, `_max`; `groupBy` filters
aggregates via `having`:

```ts
await db.post.groupBy({ by: 'authorId', _count: true, having: { viewCount: { _sum: { gt: 100 } } } });
```

**Create**: `create` (supports nested writes, runs in a transaction), `createMany` (no nested
relations; returns a count), `createManyAndReturn`.

```ts
await db.user.create({
    data: { email: 'a@b.com', posts: { create: [{ title: 'Hello' }] } },
});
```

**Update**: `update`, `updateMany` / `updateManyAndReturn` (scalar fields only), `upsert`. List
fields use `push` / `set`:

```ts
await db.post.update({ where: { id: 1 }, data: { topics: { push: 'webdev' } } });
await db.post.upsert({
    where: { id: 1 },
    create: { id: 1, title: 'New' },
    update: { title: 'Updated' },
});
```

**Delete**: `delete`, `deleteMany`, `deleteManyAndReturn`.

## Relation queries — `select` / `include` / `omit`

- `select`: pick specific fields; for a relation pass a nested object. Mutually exclusive with
  `include`/`omit`.
- `include`: pull in relations (`true` for all fields, or an object to filter/`where` the relation).
  Mutually exclusive with `select`.
- `omit`: drop specific scalar fields. Mutually exclusive with `select`.

```ts
await db.user.findMany({
    include: { posts: { where: { published: true }, select: { id: true, title: true } } },
});
```

Nested writes inside `create`/`update`/`upsert` can `create`, `connect`, `disconnect`, update, and
delete related records (deeply), all within a transaction.

## Computed fields

A field declared `@computed` in ZModel (see `zenstack-schema-modeling`) is evaluated **on the
database side**. Provide its implementation as a Kysely expression in the `computedFields` client
option; thereafter it behaves like a regular field — returned by queries, and usable in `select`,
`where`, `orderBy`, and `aggregate`.

```ts
const db = new ZenStackClient(schema, {
    dialect,
    computedFields: {
        User: {
            // SQL: (SELECT COUNT(*) FROM "Post" WHERE "Post"."authorId" = "User"."id")
            postCount: (eb) =>
                eb.selectFrom('Post')
                    .whereRef('Post.authorId', '=', 'id')
                    .select(({ fn }) => fn.countAll<number>().as('count')), // selection must be named
        },
    },
});

await db.user.findFirst();                                   // postCount included
await db.user.findFirst({ select: { email: true, postCount: true } });
await db.user.findMany({ where: { postCount: { gt: 1 } }, orderBy: { postCount: 'desc' } });
await db.user.aggregate({ _avg: { postCount: true } });
```

The callback's second arg is a `context` with `modelAlias` — use `sql.ref(\`${modelAlias}.id\`)`
(import `sql` from `@zenstackhq/orm/helpers`) to qualify the containing model's columns on conflicts.

## Polymorphic models

For models using `@@delegate` inheritance (see `zenstack-schema-modeling`), query via the usual model
accessors:

- **Create** concrete models (`db.video.create(...)`) — the base row is created automatically. Base
  models **cannot** be created directly.
- **Query a base** model (`db.content.findMany()`) and each result includes the concrete model's
  fields (unless you narrow with `select`). Querying a concrete model returns base + concrete fields.
- **Delete** either side and the counterpart row is removed too.

```ts
const user = await db.user.create({ data: { email: 'u1@test.com' } });
await db.post.create({ data: { name: 'Post1', content: 'Hi', ownerId: user.id } });
await db.video.create({ data: { name: 'Video1', url: 'http://v/1', ownerId: user.id } });

const content = await db.content.findFirstOrThrow();   // includes concrete fields
await db.user.findFirstOrThrow({ include: { contents: true } });
```

The discriminator value is typed as a string literal (or enum member), so checking it **narrows** the
result type to the matching concrete model:

```ts
const c = await db.content.findUniqueOrThrow({ where: { id: 1 } });
if (c.type === 'video') console.log(c.url);    // narrowed to Video
else if (c.type === 'image') console.log(c.data);
```

## Strongly-typed JSON

A field typed with a custom `type` + `@json` (see `zenstack-schema-modeling`) is returned **strongly
typed** (derived from the ZModel type), and inputs are validated against that type on
create/update. Validation is *loose* — extra fields not in the type are allowed.

```ts
// query results are typed: user.profile.age / user.profile.gender
const user = await db.user.create({
    data: { email: 'u1@test.com', profile: { gender: 'male', age: 20 } },
});

await db.user.update({
    where: { id: user.id },
    data: { profile: { ...user.profile, tag: 'vip' } }, // extra `tag` is allowed
});
```

## Data validation

Validation rules are declared in ZModel and enforced by the ORM on `create`/`update` inputs (not on
the query builder / raw SQL). Failures throw `ORMError` with reason `INVALID_INPUT`. Each attribute
takes an optional trailing `message`.

**Field attributes**

- String length / lists: `@length(min?, max?)`
- String content: `@startsWith`, `@endsWith`, `@contains`, `@email`, `@url`, `@phone` (E.164),
  `@datetime` (ISO 8601), `@regex(pattern)`
- String transforms (applied before save): `@lower`, `@upper`, `@trim`
- Numbers: `@gt`, `@gte`, `@lt`, `@lte`

```zmodel
model User {
    email    String  @email("Invalid email")
    password String  @length(8, 128)
    age      Int     @gte(0) @lte(150)
    website  String? @url
}
```

**Model-level `@@validate(condition, message?, path?)`** for cross-field rules, with helper
functions: `now()`, `length()`, `startsWith`/`endsWith`/`contains`, `isEmail`/`isUrl`/`isPhone`/
`isDateTime`, `regex()`, `has`/`hasSome`/`hasEvery`/`isEmpty`.

```zmodel
model Event {
    startDate DateTime
    endDate   DateTime
    tags      String[]
    @@validate(endDate > startDate, "End date must be after start date")
    @@validate(!isEmpty(tags), "At least one tag is required")
}
```

Validation runs before access policies and before the database is touched. For access control see
`zenstack-access-control`. After editing validation rules (or any ZModel — including `procedure`
declarations), run `zen generate` to regenerate the client (it also validates the schema); run
`zen check` if you only want to validate without regenerating.

## Transactions — `$transaction`

**Sequential** — array of operations, executed in order, no cross-access:

```ts
const [a, b] = await db.$transaction([
    db.user.create({ data: { name: 'Alice' } }),
    db.user.create({ data: { name: 'Bob' } }),
]);
```

**Interactive** — callback receiving a transaction client; results feed later steps. Keep it short.

```ts
const post = await db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: 'Alice' } });
    return tx.post.create({ data: { title: 'Hi', authorId: user.id } });
});
```

> ORM call results are lazy promises — they don't run until awaited (directly or inside
> `$transaction`).

## Kysely query builder — `$qb` and `$expr`

Use the full Kysely API (typed from the schema) when the ORM API isn't enough. See
https://kysely.dev for the builder API.

```ts
const rows = await db.$qb
    .selectFrom('User')
    .select(['id', 'name'])
    .where('age', '>', 18)
    .execute();
```

Inject a Kysely expression into an ORM `where` with `$expr` to mix the two:

```ts
await db.post.findMany({
    where: {
        published: true,
        $expr: (eb) => eb('viewCount', '>', 100),
    },
});
```

> The query builder bypasses access policies and ORM-level validation — keep that in mind when a
> policy plugin is installed.

## Custom procedures (v3.2.0+)

Declare typed operations in ZModel, implement them at client construction, call via `$procs`.

```zmodel
procedure getUserFeeds(userId: Int, limit: Int?) : Post[]
mutation procedure signUp(email: String) : User
```

```ts
const db = new ZenStackClient(schema, {
    dialect,
    procedures: {
        getUserFeeds: ({ client, args }) =>
            client.post.findMany({ where: { authorId: args.userId }, take: args.limit }),
        signUp: ({ client, args }) => client.user.create({ data: { email: args.email } }),
    },
});

const user = await db.$procs.signUp({ args: { email: 'alice@example.com' } });
const feeds = await db.$procs.getUserFeeds({ args: { userId: user.id, limit: 20 } });
```

Args are validated against the ZModel types before the callback runs; return values are not — match
them yourself. Throw `ORMError` for failures.

## Raw SQL

`$queryRaw` / `$executeRaw` use tagged templates (parameterized, safe); the `*Unsafe` variants take
plain strings and are injection-prone.

```ts
const users = await db.$queryRaw<{ id: number; email: string }[]>`
    SELECT id, email FROM "User" WHERE role = ${role}`;
const affected = await db.$executeRaw`UPDATE "User" SET name = ${name} WHERE id = ${id}`;
```

Raw SQL bypasses access control; with the policy plugin installed it requires
`dangerouslyAllowRawSql`.

## Logging

Pass a `log` option to `ZenStackClient` — an array of levels, or a function. It's forwarded to the
underlying Kysely instance.

```ts
const db = new ZenStackClient(schema, {
    dialect,
    log: ['query', 'error'],
    // or a function:
    // log: (event) => console.log(`[${event.level}] ${event.queryDurationMillis}ms`),
});
```

## Error handling

All ORM errors are `ORMError`. Inspect `error.reason` (`CONFIG_ERROR`, `INVALID_INPUT`, `NOT_FOUND`,
`REJECTED_BY_POLICY`, `DB_QUERY_ERROR`, `NOT_SUPPORTED`, `INTERNAL_ERROR`); other fields include
`model`, `dbErrorCode`, `dbErrorMessage`, `rejectedByPolicyReason`, and (for `DB_QUERY_ERROR`)
`sql`/`sqlParams`.

```ts
import { ORMError } from '@zenstackhq/orm';

try {
    await userDb.post.create({ data: { title: '' } });
} catch (e) {
    if (e instanceof ORMError && e.reason === 'REJECTED_BY_POLICY') {
        // handle access-denied
    }
}
```

## Reference docs

Full ZenStack documentation for this topic is bundled under [`references/`](references/):

- [client.md](references/client.md) — creating the `ZenStackClient` (SQLite/Postgres/MySQL dialects)
- [orm-overview.md](references/orm-overview.md) — ORM overview
- [api-overview.md](references/api-overview.md) — ORM API overview
- [api-find.md](references/api-find.md) — find operations
- [api-create.md](references/api-create.md) — create / nested writes
- [api-update.md](references/api-update.md) — update / upsert / nested writes
- [api-delete.md](references/api-delete.md) — delete operations
- [api-filter.md](references/api-filter.md) — filter operators
- [api-aggregate.md](references/api-aggregate.md) — aggregate
- [api-count.md](references/api-count.md) — count
- [api-group-by.md](references/api-group-by.md) — groupBy
- [api-transaction.md](references/api-transaction.md) — `$transaction`
- [api-raw-sql.md](references/api-raw-sql.md) — raw SQL
- [query-builder.md](references/query-builder.md) — the Kysely `$qb` escape hatch
- [custom-procedures.md](references/custom-procedures.md) — custom procedures
- [computed-fields.md](references/computed-fields.md) — computed fields at runtime
- [polymorphism.md](references/polymorphism.md) — querying polymorphic models
- [typed-json.md](references/typed-json.md) — strongly-typed JSON fields at runtime
- [validation.md](references/validation.md) — data validation
- [input-validation-reference.md](references/input-validation-reference.md) — validation attribute reference
- [inferred-types.md](references/inferred-types.md) — inferred model/input types
- [logging.md](references/logging.md) — client logging configuration
- [errors.md](references/errors.md) — `ORMError` and error reasons
