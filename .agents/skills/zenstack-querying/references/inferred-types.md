---
description: TypeScript types derived from the ZModel schema
---

# Schema-Inferred Types

Most of the time, you don't need to explicitly type the input and output of the ORM methods, thanks to TypeScript's powerful inference capabilities. However, when you do have the need, you can rely on the following utilities to type things:

- `$output/models`

    The `zen generate` command generates a `models` module that exports types for all models, types, and enums. The model types include all scalar fields (including computed ones).

- `$output/input`

    The `zen generate` command generates an `input` module that exports types for input arguments of the ORM methods, such as `UserCreateArgs`, `PostUpsertArgs`, etc. You can use them to type intermediary variables that are later passed to the ORM methods.

- `ModelResult`

    The `ModelResult` generic type from `@zenstackhq/orm` allows you to infer the exact model type given field selection and relation inclusion information.

## Samples

**`inferred-types.ts`**

```typescript
import type { ClientOptions, ModelResult } from '@zenstackhq/orm';
import type { UserCreateArgs } from './zenstack/input';
import type { User } from './zenstack/models';
import { SchemaType } from './zenstack/schema';

// `User` type includes all scalar fields
const user: User = { id: 1, email: 'u1@test.com', profile: null };
console.log(user);

// you can use types from the `input` module to type query arguments
const userCreate: UserCreateArgs = { data: { email: 'u1@test.com' } };

// the `ModelResult` type can be used to infer model's type given field selection
// and relation inclusion
// { id: number, email: string; postCount: number; posts: Post[] }
type UserWithPosts = ModelResult<SchemaType, 'User', { include: { posts: true } }>;
```
