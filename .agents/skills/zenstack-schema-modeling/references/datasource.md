---
description: Datasource in ZModel
---

# Data Source

The `datasource` block provides information about the database your application uses. The ORM relies on it to determine the proper SQL dialect to use when generating queries. If you use [Migration](../orm/migration.md), it must also have a `url` field that specifies the database connection string, so that the migration engine knows how to connect to the database. The `env` function can be used to reference environment variables so you can keep sensitive information out of the code.

Each ZModel schema must have exactly one `datasource` block.

**PostgreSQL**

```zmodel
datasource db {
    provider = 'postgresql'
    url      = env('DATABASE_URL')
}
```

**SQLite**

```zmodel
datasource db {
    provider = 'sqlite'
    url      = 'file:./dev.db'
}
```

PostgreSQL, MySQL and SQLite are supported. There's no plan for other relational database types or NoSQL databases.

> **🔋 ZModel vs Prisma Schema**

ZenStack's ORM runtime doesn't rely on the `url` information to connect to the database. Instead, you provide the information when constructing an ORM client — more on this in the [ORM](../orm/) part.
