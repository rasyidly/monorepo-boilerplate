---
description: Strongly typed JSON fields
---

# Strongly Typed JSON

> **🔋 ZenStack vs Prisma**

Strongly typed JSON is a ZModel feature and doesn't exist in Prisma.

ZModel allows you to define custom types and use them to [type JSON fields](../modeling/typed-json.md). The ORM respects such fields in two ways:

1. The return type of such fields is typed as TypeScript types derived from the ZModel custom type definition.
2. When creating or updating such fields, the ORM validates the input against the custom type definition. By default, the engine "loosely" validates the mutation input and doesn't prevent you from including fields not defined in the custom type.

## Strict JSON

> **Available since v3.9.2**

You can indicate the ORM should reject unknown fields by decorating the custom type definition with the `@@strict` attribute. The presence of unknown fields would then be reported as both a compilation error and a runtime validation error.

## Samples

**`zenstack/schema.zmodel`**

```zmodel
datasource db {
    provider = 'sqlite'
}

type Profile {
    age    Int
    gender String?
    jobs   Job[]?
}

type Job {
    company String
    title   String
}

model User {
    id      Int     @id @default(autoincrement())
    email   String  @unique
    profile Profile @json
}
```

**`main.ts`**

```typescript
import { createClient } from './db';

async function main() {
  const db = await createClient();

  try {
    await db.user.create({
      // @ts-expect-error missing required 'age' field
      data: { email: 'u1@test.com', profile: { gender: 'male' } }
    });
  } catch (err: any) {
    console.log('Got expected error:', err.message);
  }

  // query results have the `profile` field strongly typed
  const user = await db.user.create({
    data: { email: 'u1@test.com', profile: { gender: 'male', age: 20 } }
  });
  console.log(`User created: age ${user.profile.age}, gender ${user.profile.gender}`);

  // it doesn't prevent you from adding extra fields to the object
  console.log('Update typed-JSON field with extra fields');
  console.log(
    await db.user.update({
      where: { id: user.id },
      data: { profile: { ...user.profile, tag: 'vip' } }
    })
  );
}

main();
```
