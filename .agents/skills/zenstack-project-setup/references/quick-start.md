---
description: Quick start guide
---

# Quick Start

There are several ways to start using ZenStack ORM.

## 1. Creating a project from scratch

Run the following command to scaffold a new project with a pre-configured minimal starter:

```bash
npm create zenstack my-project
```

Or simply use the following interactive playground to experience it inside the browser.

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

**`main.ts`**

```typescript
import { ZenStackClient } from '@zenstackhq/orm';
import { SqlJsDialect } from '@zenstackhq/orm/dialects/sql.js';
import initSqlJs from 'sql.js';
import { schema } from './zenstack/schema';

async function main() {
  // initialize sql.js engine
  const SQL = await initSqlJs();

  // create database client with sql.js dialect
  const db = new ZenStackClient(schema, {
    dialect: new SqlJsDialect({ sqlJs: new SQL.Database() }),
  });

  // push schema to the database (`$pushSchema` is for testing only)
  await db.$pushSchema();

  // create a user with some posts
  await db.user.create({
    data: {
      id: 1,
      email: 'u1@test.com',
      posts: {
        create: [{ title: 'Post1' }, { title: 'Post2' }]
      }
    }
  });

  // high-level query API
  const userWithPosts = await db.user.findFirst({
    where: { id: 1 },
    include: { posts: true }
  });
  console.log(userWithPosts);

  // low-level SQL query builder API
  const userPostJoin = await db
    .$qb
    .selectFrom('User')
    .innerJoin('Post', 'Post.authorId', 'User.id')
    .select(['User.id', 'User.email', 'Post.title'])
    .where('User.id', '=', 1)
    .execute();
  console.log(userPostJoin);
}

main();
```

## 2. Adding to an existing project

To add ZenStack to an existing project, run the CLI `init` command to install dependencies and create a sample schema:

```bash
npx @zenstackhq/cli init
```

Then create a `zenstack/schema.zmodel` file in the root of your project. You can use the following sample schema to get started:

```zmodel
  datasource db {
      provider = 'sqlite'
      url = 'file:./dev.db'
  }

  model User {
      id       String @id @default(cuid())
      email    String @unique
      posts    Post[]
  }

  model Post {
      id        String   @id @default(cuid())
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
      title     String
      content   String
      published Boolean  @default(false)
      author    User     @relation(fields: [authorId], references: [id])
      authorId  String
  }
  ```

Finally, run `zen generate` to compile the schema into TypeScript. Optionally, run `zen db push` to push the schema to the database.

```bash
npx zen generate
```

## 3. Manual setup

You can also always configure a project manually with the following steps:

1. Install dependencies

  ```bash
npm install @zenstackhq/schema @zenstackhq/orm
npm install --save-dev @zenstackhq/cli
```

1. Create a `zenstack/schema.zmodel` file

  You can use the following sample schema to get started:


```zmodel
  datasource db {
      provider = 'sqlite'
      url = 'file:./dev.db'
  }

  model User {
      id       String @id @default(cuid())
      email    String @unique
      posts    Post[]
  }

  model Post {
      id        String   @id @default(cuid())
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt
      title     String
      content   String
      published Boolean  @default(false)
      author    User     @relation(fields: [authorId], references: [id])
      authorId  String
  }
  ```

3. Run the CLI `generate` command to compile the schema into TypeScript

  ```bash
npx zen generate
```

> **Info**

By default, ZenStack CLI loads the schema from `zenstack/schema.zmodel`. You can change this by passing the `--schema` option. TypeScript files are by default generated to the same directory as the schema file. You can change this by passing the `--output` option. The default settings can also be changed as explained in the [CLI reference](./reference/cli#overriding-default-options).

You can choose to either commit the generated TypeScript files to your source control (recommended), or add them to `.gitignore` and generate them on the fly in your CI/CD pipeline.
