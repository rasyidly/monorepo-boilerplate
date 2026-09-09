---
name: zenstack-schema-modeling
description: Author ZModel (.zmodel) data schemas for ZenStack V3. Use when defining models, fields, field/model attributes, relations (1-1, 1-many, many-many, self), enums, custom types & mixins, polymorphic models (@@delegate), strongly-typed JSON fields, or computed fields.
---

# ZenStack — Schema Modeling (ZModel)

ZModel is ZenStack's schema language — a superset of Prisma's schema. The schema lives at
`zenstack/schema.zmodel` by default. For access policies/validation use `zenstack-access-control`;
for queries use `zenstack-querying`.

After editing the schema:

```bash
zen check      # only validate the schema for syntax/semantic errors (use --schema <file> for a non-default path)
zen generate   # regenerate the database client — also validates the schema as it compiles
```

Run `zen check` when you just want to confirm the schema is valid; run `zen generate` when you want
to regenerate the client (the normal step after a schema change).

Strings accept both single and double quotes. **Every valid Prisma schema is valid ZModel**, so
existing Prisma knowledge transfers directly — the sections below cover both the basics and the
additions ZModel layers on top.

## Datasource

Exactly one `datasource` block per schema. The ORM runtime doesn't use `url` (the driver carries
the connection); the migration engine does.

```zmodel
datasource db {
    provider = 'postgresql'        // 'postgresql' | 'mysql' | 'sqlite'
    url      = env('DATABASE_URL') // or 'file:./dev.db' for SQLite
}
```

> ZModel has **no `generator` block**. Code generation is driven by `zen generate`; optional behavior
> is configured with `plugin` blocks (e.g. `plugin policy`, `plugin prisma`).

## Models & fields

```zmodel
model User {
    id        Int      @id @default(autoincrement())
    email     String   @unique
    name      String?              // optional
    role      Role     @default(USER)
    tags      String[]             // list
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}
```

**Scalar types**: `String`, `Boolean`, `Int`, `BigInt`, `Float`, `Decimal`, `DateTime`, `Json`,
`Bytes`, `Unsupported("...")`.

**Modifiers**: `?` optional, `[]` list. A field cannot be both optional *and* a list.

### Field attributes (`@`)

`@id`, `@unique`, `@default(...)`, `@updatedAt`, `@map('col')`, `@relation(...)`, `@db.*` (native
type, e.g. `@db.VarChar(64)`), `@json` (typed-JSON field), `@computed` (virtual field).

### Model attributes (`@@`)

`@@id([a, b])` (composite PK), `@@unique([a, b])`, `@@index([a, b])`, `@@map('table')`,
`@@delegate(field)` (polymorphism), plus `@@allow` / `@@deny` / `@@validate` (see
`zenstack-access-control`).

```zmodel
model City {
    country String
    name    String
    @@id([country, name])     // composite primary key
    @@map('cities')
}
```

A model needs an identifier: a `@id` field, an `@@id([...])`, or — failing those — a `@unique`
field / `@@unique([...])`.

### Default value functions

`autoincrement()`, `now()`, `cuid()`, `uuid()` / `uuid(4)`, `ulid()`, `nanoid()`,
`dbgenerated("...")`, plus literals and enum values.

Since v3.1.0, string ID generators accept a `format` with `%s`:

```zmodel
id String @id @default(uuid(4, "user_%s"))   // -> "user_<uuid>"
```

## Enums

```zmodel
enum Role {
    USER
    ADMIN
}
```

Enum value names are global and must not collide.

## Relations

The **owner** side holds the foreign key (`@relation(fields: [...], references: [...])`).

**One-to-one** — FK is `@unique`; the non-owner side is optional:

```zmodel
model User {
    id      Int      @id
    profile Profile?
}
model Profile {
    id     Int  @id
    user   User @relation(fields: [userId], references: [id])
    userId Int  @unique
}
```

**One-to-many** — list on the non-owner side:

```zmodel
model User {
    id    Int    @id
    posts Post[]
}
model Post {
    id       Int  @id
    author   User @relation(fields: [authorId], references: [id])
    authorId Int
}
```

**Many-to-many (implicit)** — list on both sides; the migration engine creates the join table:

```zmodel
model User { id Int @id  posts Post[] }
model Post { id Int @id  editors User[] }
```

**Many-to-many (explicit)** — model the join table yourself when it needs extra fields:

```zmodel
model UserPost {
    user   User @relation(fields: [userId], references: [id])
    userId Int
    post   Post @relation(fields: [postId], references: [id])
    postId Int
    @@id([userId, postId])
}
```

**Named relations** disambiguate multiple relations between the same two models (give both ends the
same name): `@relation('UserPosts', ...)`.

**Self-relations** use a named relation, e.g. a one-to-many manager/reports tree:

```zmodel
model Employee {
    id           Int        @id
    managerId    Int?
    manager      Employee?  @relation('Mgmt', fields: [managerId], references: [id])
    subordinates Employee[] @relation('Mgmt')
}
```

**Referential actions** on the owner side: `onDelete` / `onUpdate` with `Cascade`, `Restrict`,
`NoAction`, `SetNull`, `SetDefault`.

```zmodel
author User @relation(fields: [authorId], references: [id], onDelete: Cascade)
```

## Custom types & mixins

A `type` declaration is **not** backed by a table. Use it for typed JSON (below) or as a **mixin**
of reusable fields, applied with `with`:

```zmodel
type BaseFields {
    id        String   @id @default(cuid())
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
}

model User with BaseFields {
    email String @unique
}
model Post with BaseFields {
    title String
}
```

Mixin fields are inlined into the model. Multiple mixins are allowed if names don't conflict. This is
ZModel's mechanism for sharing fields across models (use it instead of an abstract base model).

A type may even carry relation fields (v3.6.0+), but then it can only be used as a mixin, not as a
JSON field:

```zmodel
type AuditMixin {
    createdBy   User   @relation('CreatedBy', fields: [createdById], references: [id])
    createdById String
}
model Post with AuditMixin { title String }
```

## Polymorphism — `@@delegate`

Multi-table inheritance: a base model with a discriminator field and `@@delegate`, concrete models
using `extends`. Concrete and base rows share the same id; you create concrete models, never the
base directly.

```zmodel
model Content {
    id        Int      @id @default(autoincrement())
    createdAt DateTime @default(now())
    owner     User     @relation(fields: [ownerId], references: [id])
    ownerId   Int
    type      String   // discriminator
    @@delegate(type)
}

model Post extends Content {
    content String
}
model Image extends Content {
    data Bytes
}
```

Customize the stored discriminator value with `@@delegateMap` (v3.7.1+), which also works with enum
discriminators:

```zmodel
model Video extends Content {
    url String
    @@delegateMap("video")
}
```

## Strongly-typed JSON

Define a `type`, use it as a field type, and mark the field `@json`. The column is plain JSON in the
database, but ZenStack validates writes and returns a typed value.

```zmodel
type Address {
    street  String
    city    String
    zip     Int
}
model User {
    id      Int     @id
    address Address @json
}
```

## Computed fields

Declare a virtual field with `@computed`; implement it with a Kysely expression in the client
config. It can be selected, filtered, sorted, and referenced in policies.

```zmodel
model User {
    id        Int @id
    postCount Int @computed
}
```

```ts
const db = new ZenStackClient(schema, {
    dialect,
    computedFields: {
        User: {
            postCount: (eb) =>
                eb.selectFrom('Post')
                    .whereRef('Post.authorId', '=', 'id')
                    .select(({ fn }) => fn.countAll<number>().as('count')),
        },
    },
});
```

## ZModel additions over Prisma

- No `generator` block (use `zen generate` + `plugin`s).
- `type` declarations + `with` mixins, `@@delegate` polymorphism, `@json` typed JSON, and
  `@computed` fields are ZenStack additions Prisma lacks.
- Single or double quotes are both fine.

## Reference docs

Full ZenStack documentation for this topic is bundled under [`references/`](references/):

- [modeling-overview.md](references/modeling-overview.md) — data modeling concepts
- [datasource.md](references/datasource.md) — the `datasource` block
- [model.md](references/model.md) — models, fields, ids, defaults
- [attribute.md](references/attribute.md) — field & model attributes
- [relation.md](references/relation.md) — 1-1, 1-many, many-many, self relations
- [enum.md](references/enum.md) — enums
- [custom-type.md](references/custom-type.md) — `type` declarations
- [mixin.md](references/mixin.md) — reusable field mixins (`with`)
- [polymorphism.md](references/polymorphism.md) — `@@delegate` polymorphic models
- [typed-json.md](references/typed-json.md) — strongly-typed JSON fields
- [computed-fields.md](references/computed-fields.md) — `@computed` fields
- [zmodel-attribute-reference.md](references/zmodel-attribute-reference.md) — complete attribute reference
- [zmodel-function-reference.md](references/zmodel-function-reference.md) — attribute-function reference
