---
description: Polymorphic models
---

# Polymorphic Models

> **🔋 ZenStack vs Prisma**

Polymorphic models is a major feature that sets ZenStack apart from Prisma.

ZenStack natively supports polymorphic models. As we have seen in the [Polymorphism](../modeling/polymorphism.md) section in the data modeling part, the ZModel language allows you to define models with Object-Oriented style inheritance. This section will describe the ORM runtime behavior of polymorphic models.

## CRUD behavior

Polymorphic models' CRUD behavior is similar to that of regular models, with two major differences:

1. Base model entities cannot be created directly as they cannot exist without an associated concrete model entity.
2. When querying a base model (either top-level or nested), the result will include all fields of the associated concrete model (unless fields are explicitly selected).

The ORM query API hides all the complexity of managing polymorphic models for you:
- When creating a concrete model entity, its base entity is automatically created.
- When querying a base entity, the ORM fetches the associated concrete entity and merges the results.
- When deleting a base or concrete entity, the ORM automatically deletes the counterpart entity.

## Customizing the discriminator value

> **Available since v3.7.1**

By default, when the ORM creates a concrete entity, it stores the concrete model's **name** in the base model's discriminator field. For instance, given the schema below, creating a `Video` writes `"Video"` to `Content.type`, and creating an `Image` writes `"Image"`.

```zmodel
model Content {
    id   Int    @id
    type String
    @@delegate(type)
}

model Video extends Content { url String }
model Image extends Content { data Bytes }
```

If the model names don't match the values you want to store, you can override the value with the `@@delegateMap` attribute on each concrete model.

### String discriminator

When the discriminator field is a `String`, pass a string literal to `@@delegateMap`:

```zmodel
model Content {
    id   Int    @id
    type String
    @@delegate(type)
}

model Video extends Content {
    url String
    // highlight-next-line
    @@delegateMap("video")
}

model Image extends Content {
    data Bytes
    // highlight-next-line
    @@delegateMap("image")
}
```

### Enum discriminator

When the discriminator field is an enum, pass an enum member to `@@delegateMap`. The member must come from the same enum as the discriminator field:

```zmodel
enum AssetKind {
    ASSET_KIND_VIDEO
    ASSET_KIND_IMAGE
}

model Asset {
    id   Int       @id
    type AssetKind
    @@delegate(type)
}

model Video extends Asset {
    url String
    // highlight-next-line
    @@delegateMap(ASSET_KIND_VIDEO)
}

model Image extends Asset {
    data Bytes
    // highlight-next-line
    @@delegateMap(ASSET_KIND_IMAGE)
}
```

### TypeScript narrowing

The discriminator value flows into the result type as a string literal (or enum member), so a check on the base field narrows the result to the matching concrete model:

```ts
const content = await client.content.findUniqueOrThrow({ where: { id: 1 } });
if (content.type === 'video') {
    // narrowed to Video — `url` is available
    console.log(content.url);
} else if (content.type === 'image') {
    // narrowed to Image — `data` is available
    console.log(content.data);
}
```

## Samples

The schema used in the sample involves a base model and three concrete models:

**`zenstack/schema.zmodel`**

```zmodel
// This is a sample model to get you started.

datasource db {
    provider = 'sqlite'
}

model User {
    id       Int       @id @default(autoincrement())
    email    String    @unique
    contents Content[]
}

model Content {
    id        Int      @id @default(autoincrement())
    name      String
    createdAt DateTime @default(now())
    owner     User     @relation(fields: [ownerId], references: [id])
    ownerId   Int
    viewCount Int      @default(0)
    type      String

    @@delegate(type)
}

model Post extends Content {
    content String
}

model Image extends Content {
    data Bytes
}

model Video extends Content {
    url String
}
```

**`main.ts`**

```typescript
import { createClient } from './db';

async function main() {
  const db = await createClient();

  const user = await db.user.create({ data: { email: 'u1@test.com' }});

  console.log('Create a Post');
  console.log(
    await db.post.create({
      data: { name: 'Post1', content: 'First post', ownerId: user.id }
    })
  );

  console.log('Create a Video');
  console.log(
    await db.video.create({
      data: { name: 'Video1', url: 'http://my/video/1', ownerId: user.id }
    })
  );

  console.log('Fetch User with contents');
  console.log(
    await db.user.findFirstOrThrow({ include: { contents: true } })
  );

  console.log('Fetch with base Content model, result includes sub model fields');
  const content = await db.content.findFirstOrThrow();
  console.log(content);

  console.log('Delete Videos');
  await db.video.deleteMany();
  console.log('Remaining Content entities:');
  // deletion of concrete entities cascades to the base
  console.log(
    await db.content.findMany()
  );
}

main();
```
