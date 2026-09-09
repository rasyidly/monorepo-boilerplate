---
name: zenstack-access-control
description: Add access control to a ZenStack V3 schema. Use when writing access policies (@@allow / @@deny), the auth() function, field-level rules, post-update rules, or setting up the policy plugin and $setAuth runtime. (For data validation — @email/@length/@@validate — see zenstack-querying.)
---

# ZenStack V3 — Access Control

ZenStack enforces access policies declared in ZModel at the ORM layer. Policies live next to your
models (see `zenstack-schema-modeling`); enforcement is opt-in via a runtime plugin. For client/query
basics — and for **data validation** — see `zenstack-querying`.

After editing policies, run `zen generate` to regenerate the client (it also validates the schema,
policy expressions included). If you only want to validate without regenerating, run `zen check`.

## Runtime setup (required for policies to apply)

Policies do nothing until you (1) declare the plugin in the schema and (2) install it on the client.

**Schema:**

```zmodel
plugin policy {
    provider = '@zenstackhq/plugin-policy'
}
```

Install the package: `npm install @zenstackhq/plugin-policy`.

**Client:**

```ts
import { ZenStackClient } from '@zenstackhq/orm';
import { PolicyPlugin } from '@zenstackhq/plugin-policy';

const db = new ZenStackClient(schema, { dialect });   // raw, unprotected
export const authDb = db.$use(new PolicyPlugin());     // access control enforced
```

`ZenStackClient` instances are **immutable** — `$use()` and `$setAuth()` return new (cheap, shallow-
clone) instances and never mutate the original. Query with `db` to bypass policies (e.g. trusted
server code) and with the policy-enforced client for user-facing access.

## The current user — `auth()` and `$setAuth()`

Bind the authenticated user per request; `auth()` in policies resolves to it.

```ts
const userDb = authDb.$setAuth(user);   // user-bound client
await userDb.post.findMany();           // policies evaluated against `user`
```

- No `$setAuth()` → anonymous mode → `auth()` is `null`. `$setAuth(undefined)` forces anonymous.
- Read the bound user back via `client.$auth`.

**Define what `auth()` returns**, by priority: a `model`/`type` annotated `@@auth`, otherwise a
model literally named `User`, otherwise a compile error. Using a `type` decouples the auth shape
from your tables:

```zmodel
type Auth {
    id   Int
    role String
    @@auth
}
```

## Policy rules — `@@allow` / `@@deny`

```
@@allow(operation, condition)
@@deny(operation, condition)
```

**Operations** (comma-separate to combine): `create`, `read`, `update`, `delete`, `post-update`,
and `all` (= create+read+update+delete, **not** post-update).

**Evaluation** (secure by default): any matching `@@deny` → denied; else any matching `@@allow` →
allowed; else denied. `read`/`update`/`delete` silently *filter out* rows that fail, rather than
erroring; `create` is checked before insert.

```zmodel
model User {
    id    Int    @id @default(autoincrement())
    email String @unique
    posts Post[]

    @@allow('create,read', true)        // anyone can sign up; profiles public
    @@allow('all', auth().id == id)     // the user has full access to themselves
}

model Post {
    id        Int     @id @default(autoincrement())
    title     String
    published Boolean @default(false)
    author    User    @relation(fields: [authorId], references: [id])
    authorId  Int

    @@deny('all', auth() == null)       // no anonymous access
    @@allow('read', published)          // published posts readable by anyone
    @@allow('all', auth().id == authorId) // author has full access
}
```

## Policy expressions

- Operators: `==` `!=` `>` `>=` `<` `<=`, `&&` `||` `!`, and field references.
- **To-one relations**: dot access — `auth().city == profile.address.city`.
- **To-many relations**: collection predicates
  - `relation?[cond]` — **some** match
  - `relation![cond]` — **all** match
  - `relation^[cond]` — **none** match

  ```zmodel
  @@deny('delete', posts?[published == true])   // can't delete a user with published posts
  ```
- Use `this` to escape the collection scope: `comments?[author.verified && this.published]`.
- **`create` rules** can only reference *owned* relations (those whose FK the model holds) — other
  relations don't exist yet at creation time.
- **`check(relation [, op])`** delegates the check to a to-one relation's policies, avoiding
  duplication: `@@allow('read', check(user))` / `@@allow('update', check(user, 'update'))`.
- Helper functions usable in expressions: `contains`, `startsWith`, `endsWith` (each takes an
  optional case-insensitive flag), `has`, `hasSome`, `hasEvery`, `isEmpty`, `currentModel()`,
  `currentOperation()`.

## Field-level policies (v3.2.0+, preview)

Single-`@` `@allow` / `@deny` on a field, operations `read` and `update` only.

```zmodel
model User {
    id    Int    @id
    email String @allow('update', auth() == this)  // only the owner can change it
    name  String @deny('read', auth() == null)     // hidden from anonymous readers
}
```

- Failing a **read** policy *nullifies* the field (returned as `null`, still usable in SQL
  computations) — you can't distinguish a real `null` from a denied one.
- Failing an **update** policy rejects the whole update (`ORMError`, reason `REJECTED_BY_POLICY`).

## Post-update rules

`post-update` expresses conditions that must hold *after* an update; field references see the
**new** values, and `before()` reads the **old** values. (This replaces V2's `future()`.)

```zmodel
model Post {
    published Boolean @default(false)
    authorId  Int

    @@deny('post-update', published == true && auth().id != authorId)  // only author can publish
    @@deny('post-update', before().authorId != authorId)               // authorId is immutable
}
```

If a model has no `post-update` rule, an update only needs to pass `update`. If it has any, at least
one `@@allow('post-update', ...)` must pass.

## Execution order & error reasons

Per mutation, policies are checked **before** the database is touched (after any input validation —
see `zenstack-querying`). Policy-related `ORMError.reason` values: `REJECTED_BY_POLICY` (policy) and
`NOT_FOUND` (missing or filtered out by a read policy). `REJECTED_BY_POLICY` further carries
`rejectedByPolicyReason`: `NO_ACCESS`, `CANNOT_READ_BACK` (mutation allowed but result not readable
back), or `OTHER`.

## Limitations

- Database-level cascade deletes/updates and triggers are **not** policed by ZenStack.
- Raw SQL (`$queryRaw`/`$executeRaw`) and query-builder access bypass policies. Allow raw SQL while
  the policy plugin is installed only via `new PolicyPlugin({ dangerouslyAllowRawSql: true })`
  (v3.5.0+).

## Reference docs

Full ZenStack documentation for this topic is bundled under [`references/`](references/):

- [access-control-overview.md](references/access-control-overview.md) — how access control works
- [write-policies.md](references/write-policies.md) — `@@allow`/`@@deny`, `auth()`, expressions
- [enforcing-policies.md](references/enforcing-policies.md) — policy plugin + `$setAuth` runtime
- [post-update.md](references/post-update.md) — `post-update` rules and `before()`
- [field-level.md](references/field-level.md) — field-level read/update policies
- [zmodel-expression-reference.md](references/zmodel-expression-reference.md) — policy expression reference
- [policy-plugin-reference.md](references/policy-plugin-reference.md) — policy plugin options
