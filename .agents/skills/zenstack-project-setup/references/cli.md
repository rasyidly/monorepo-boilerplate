---
description: Using the CLI
---

# Using the CLI

ZenStack CLI is a command-line tool that takes the ZModel schema as input and complete different tasks for you. It's included in the "@zenstackhq/cli" package, and can be invoked with either `zen` or `zenstack` command (they are equivalent).

In the context of ORM, the CLI compiles ZModel into a TypeScript representation, which can in turn be used to create a type-safe ORM client.

You can try running the `npx zen generate` command in the following playground and inspect the TypeScript code generated inside the "zenstack" folder.

**`zenstack/schema.zmodel`**

```zmodel
// This is a sample model to get you started.

datasource db {
    provider = 'sqlite'
    url = "file:./dev.db"
}

/// User model
model User {
    id       Int    @id @default(autoincrement())
    email    String @unique
    posts    Post[]
}

/// Post model
model Post {
    id        Int      @id @default(autoincrement())
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
    title     String
    content   String?
    published Boolean  @default(false)
    author    User     @relation(fields: [authorId], references: [id])
    authorId  Int
}
```

The `generate` command generates several TypeScript files from the ZModel schema that support both development-time typing and runtime access to the schema. For more details of the generated code, please refer to the [@core/typescript](../reference/plugins/typescript.md) plugin documentation.

> **Info**

The CLI's code generation is extensible via plugins. Please refer to the [Plugin Development](../recipe/plugin-dev.md) documentation for a comprehensive guide.
