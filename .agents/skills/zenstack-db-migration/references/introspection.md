---
description: Introspecting an existing database
---

# Database Introspection

> **Available since v3.4.0**

> **Experimental Feature**

Database introspection is experimental and should be used with caution.

Database introspection loads your database's schema, calculates the difference between it and your current ZModel schema, and then
make necessary updates to the ZModel schema to bring it in sync with the database. This is useful when you have a pre-existing database and want to start using ZenStack with it, or when you need to keep your ZModel schema in sync with changes made directly to the database.

> This feature is initially contributed by [@svetch](https://github.com/svetch).

Use the `zen db pull` CLI command to run introspection. Refer to the [CLI reference](../reference/cli.md#db-pull) for more details and options.

> **Info**

The "db pull" command is NOT based on Prisma's introspection engine and has its own implementation.

## Common Workflows

### Starting a new ZenStack project from an existing database

If you already have a database and want to adopt ZenStack:

1. Initialize a ZenStack project:
    ```bash
npx zen init
```

2. Configure the `datasource` block in your ZModel schema with the correct database connection URL.
3. Run introspection to generate the schema:
     ```bash
npx zen db pull
```

4. Review and refine the generated ZModel schema (e.g., add access control rules, computed fields, etc.).
5. Run code generation:
     ```bash
npx zen generate
```

### Syncing after direct database changes

If changes were made directly to the database (outside of the ZenStack migration workflow), you can re-introspect to update your schema:

1. Run introspection:
   ```bash
   zen db pull
   ```
2. Review the ZModel schema changes and make necessary adjustments

> **Warning**

Running `zen db pull` may overwrite an existing schema file. Make sure to use source control or manually back up your schema file before running the command.
