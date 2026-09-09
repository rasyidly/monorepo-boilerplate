---
description: Plugin development guide
---

# Plugin Development

> **Preview Feature**

Plugin feature is in preview and may be subject to breaking changes in future releases.

This guide provides a comprehensive introduction to developing ZenStack plugins, demonstrating how to extend ZenStack’s functionality at the schema, CLI, and runtime levels.

## Extending the schema language

Plugins can contribute new ZModel attributes and functions, and use them to extend the data modeling semantics. To do that, create a folder in your source tree with a `plugin.zmodel` file in it, and define your custom attributes and/or functions in it.

> **Tip**

You can also package a plugin as an npm package. Make sure to export the "plugin.zmodel" file in the package's `package.json` file.

The following example shows a sample plugin that allows you to mark fields as "password" and specify hashing algorithms to use.

> **Info**

Custom attributes and functions by themselves don't have any effect. They are commonly combined with other plugin aspects to achieve a meaningful goal, like we'll see in the next sections.

**`zenstack/password-plugin/plugin.zmodel`**

```zmodel
/**
 * Marks a field to be hashed as a password. Only applicable to String fields.
 */
attribute @password(hasher: Any) @@@targetField([StringField])

/**
 * Bcrypt password hasher.
 */
function bcryptHasher(rounds: Int): Any {}

/**
 * Argon2 password hasher.
 */
function argon2Hasher(hashLength: Int?): Any {}
```

> **Info**

Model-level attributes must be prefixed with `@@`, and field-level ones with `@`.

You need to enable the plugin in your ZModel to use the attributes and functions defined in it:

```zmodel title="schema.zmodel"
plugin password {
    provider = './password-plugin'
}

model User {
    id Int @id @default(autoincrement())
    password String @password(hasher: bcryptHasher(10))
}
```

### Parameter and return types

The following types can be used for attribute parameters and function parameters and returns:

- String
- Int
- Float
- Boolean
- DateTime
- Object
- Any

A parameter can be set optional by suffixing its type with a `?`.

## Generating custom artifacts

The `zen` CLI is extensible via plugins and allows you to generate custom artifacts from the ZModel schema. To continue the previous example, let's create a very simple CLI plugin that generates a markdown document listing all model fields marked as passwords.

To implement a plugin, first install the "@zenstackhq/sdk" package that contains type definitions and utilities for working with ZModel AST:

```bash
npm install --save-dev @zenstackhq/sdk
```

A CLI plugin is an ESM module that default-exports an object that contains the following fields:

- `name`: the name of the plugin.
- `generate`: an async function that's invoked during the `zen generate` command run.
- `statusText` (optional): text displayed in the CLI during the plugin run.

The implementation looks like the following:

**`zenstack/password-plugin/index.ts`**

```typescript
import type { CliPlugin } from "@zenstackhq/sdk";
import { InvocationExpr, isDataModel } from "@zenstackhq/sdk/ast";
import fs from "node:fs";

const cliPlugin: CliPlugin = {
  name: "Password Report",

  generate: ({ model, defaultOutputPath, pluginOptions }) => {
    // `pluginOptions` contains options defined in the `plugin` block in ZModel
    if (pluginOptions["report"] !== true) {
      // no report requested
      return;
    }

    let output = "# Password Fields Report\n\n";

    // for each data model
    for (const dm of model.declarations.filter(isDataModel)) {
      // for each field
      for (const field of dm.fields) {
        // check if it has @password attribute
        const passwordAttr = field.attributes.find(
          (attr) => attr.decl.$refText === "@password"
        );
        if (passwordAttr) {
          const hasherArg = passwordAttr.args.find(
            (arg) => arg.$resolvedParam.name === "hasher"
          );
          const hasherName = hasherArg?.value
            ? (hasherArg.value as InvocationExpr).function.$refText
            : "undefined";
          output += `- **${dm.name}.${field.name}**: hasher "${hasherName}"\n`;
        }
      }
    }

    fs.writeFileSync(
      `${defaultOutputPath}/password-fields.md`,
      output,
      "utf-8"
    );
  },
};

export default cliPlugin;
```

Then, enable the reporting in ZModel with the "report" option:

```zmodel title="schema.zmodel"
plugin password {
    provider = './password-plugin'
    report = true
}
```

Finally, run the `zen generate` command to generate the report:

```bash
npx zen generate
```

You should see that the custom plugin is run during the generation process, and the markdown file is created in the output folder.

```plain
% npx zen generate
✔ Generating TypeScript schema
✔ Running plugin Password Report
Generation completed successfully in 116ms.
```

> **How does the CLI load plugin modules?**

The CLI attempts to load the plugin module following these steps:
1. If `provider` is resolvable as a file path (with ".js", ".mjs", ".ts", or ".mts" extensions), load it as a local file.
2. If `provider` is resolvable as a folder containing an index file (with ".js", ".mjs", ".ts", or ".mts" extensions), load the index file.
3. Otherwise, load it as an npm package.

Please note that only ESM modules are supported. TypeScript files are loaded via [jiti](https://github.com/unjs/jiti).

## Extending the ORM runtime

The most powerful aspect of the plugin system is the ability to extend the ORM runtime behavior. ZenStack's ORM client provides a plugin system that allows you to intercept the ORM query lifecycle at different stages and abstraction levels. Please see the [ORM plugins](../orm/plugins/) documentation for detailed information.

In this section, we'll see how to implement automatic password hashing functionality at runtime using the [Kysely](https://kysely.dev/) query hooks mechanism. The implementation requires an understanding of Kysely's [Operation Node](https://kysely-org.github.io/kysely-apidoc/interfaces/OperationNode.html) concept (which is the SQL AST used by Kysely internally).

> **Warning**

The implementation is mostly vibe-coded with Claude Code. Please review carefully before using it in production.

**`password-hasher-plugin.ts`**

```typescript
import { OnKyselyQueryCallback, RuntimePlugin } from "@zenstackhq/orm";
import {
  CallExpression,
  ExpressionUtils,
  SchemaDef,
} from "@zenstackhq/orm/schema";
import bcrypt from "bcryptjs";
import type { QueryId } from "kysely";
import {
  ColumnNode,
  ColumnUpdateNode,
  InsertQueryNode,
  OperationNodeTransformer,
  PrimitiveValueListNode,
  TableNode,
  UpdateQueryNode,
  ValueListNode,
  ValueNode,
  ValuesNode,
  type OperationNode,
} from "kysely";

/**
 * Kysely query transformer that hashes field values for insert and update nodes
 */
class PasswordHasherTransformer extends OperationNodeTransformer {
  constructor(private readonly schema: SchemaDef) {
    super();
  }

  protected override transformInsertQuery(
    node: InsertQueryNode,
    queryId?: QueryId
  ) {
    if (!node.into || !node.columns || !node.values) {
      return super.transformInsertQuery(node, queryId);
    }

    const modelName = this.extractTableName(node.into);
    if (!modelName) {
      return super.transformInsertQuery(node, queryId);
    }

    const transformedValues = this.transformInsertValues(
      modelName,
      node.columns,
      node.values
    );

    const baseResult = super.transformInsertQuery(node, queryId);

    return {
      ...baseResult,
      values: transformedValues,
    };
  }

  private transformInsertValues(
    modelName: string,
    columns: readonly ColumnNode[],
    values: OperationNode
  ): OperationNode {
    if (!ValuesNode.is(values)) {
      return values;
    }

    const transformedValueLists = values.values.map((valueList) => {
      // Handle PrimitiveValueListNode (contains raw primitive values)
      if (PrimitiveValueListNode.is(valueList)) {
        const transformedValues = valueList.values.map((value, index) => {
          const fieldName = columns[index].column.name;
          if (!this.isPasswordField(modelName, fieldName)) {
            return value;
          }
          const hashFn = this.getPasswordHasher(modelName, fieldName);
          return hashFn(value);
        });
        return PrimitiveValueListNode.create(transformedValues);
      }

      // Handle ValueListNode (contains a list of ValueNode)
      if (ValueListNode.is(valueList)) {
        const transformedValues = valueList.values.map((valueNode, index) => {
          const colNode = columns[index];
          if (!ColumnNode.is(colNode)) {
            return valueNode;
          }
          const fieldName = colNode.column.name;
          const hashFn = this.getPasswordHasher(modelName, fieldName);
          return this.transformPasswordValue(valueNode, hashFn);
        });

        return ValueListNode.create(transformedValues);
      }

      return valueList;
    });

    return ValuesNode.create(transformedValueLists);
  }

  protected override transformUpdateQuery(
    node: UpdateQueryNode,
    queryId?: QueryId
  ) {
    if (!node.table || !node.updates) {
      return super.transformUpdateQuery(node, queryId);
    }

    const modelName = this.extractTableName(node.table);
    if (!modelName) {
      return super.transformUpdateQuery(node, queryId);
    }

    const baseResult = super.transformUpdateQuery(node, queryId);

    const transformedUpdates = baseResult.updates?.map((update) => {
      if (!ColumnNode.is(update.column)) {
        return update;
      }

      const columnName = update.column.column.name;
      if (!this.isPasswordField(modelName, columnName)) {
        return update;
      }
      const hashFn = this.getPasswordHasher(modelName, columnName);
      const hashedValue = this.transformPasswordValue(update.value, hashFn);
      return ColumnUpdateNode.create(update.column, hashedValue);
    });

    return UpdateQueryNode.cloneWithUpdates(
      baseResult,
      transformedUpdates ?? []
    );
  }

  private transformPasswordValue(
    node: OperationNode,
    hashFn: (value: unknown) => unknown
  ) {
    if (!ValueNode.is(node)) {
      return node;
    }
    return ValueNode.create(hashFn(node.value));
  }

  private extractTableName(tableNode: OperationNode | undefined) {
    if (!tableNode || !TableNode.is(tableNode)) {
      return undefined;
    }
    return tableNode.table.identifier.name;
  }

  private isPasswordField(modelName: string, fieldName: string): boolean {
    const modelDef = this.schema.models[modelName];
    if (!modelDef) {
      return false;
    }

    const fieldDef = modelDef.fields[fieldName];
    if (!fieldDef) {
      return false;
    }

    return (
      fieldDef.attributes?.some((attr) => attr.name === "@password") ?? false
    );
  }

  private getPasswordHasher(modelName: string, fieldName: string) {
    const modelDef = this.schema.models[modelName]!;
    const fieldDef = modelDef.fields[fieldName]!;

    const passwordAttr = fieldDef.attributes?.find(
      (attr) => attr.name === "@password"
    )!;
    if (!passwordAttr) {
      throw new Error(
        `Field ${modelName}.${fieldName} is not a password field.`
      );
    }

    // Extract the hasher argument
    const hasherArg = passwordAttr.args?.find((arg) => arg.name === "hasher")!;

    // Extract hasher function name
    const hasherExpr = hasherArg.value as CallExpression;
    const hasherName = hasherExpr.function;

    if (hasherName !== "bcryptHasher") {
      throw new Error(`Hasher "${hasherName}" is not implemented.`);
    }

    // Extract salt rounds (default to 10 if not provided)
    let saltRounds = 10;
    const roundsArg = hasherExpr.args?.[0];
    if (
      ExpressionUtils.isLiteral(roundsArg) &&
      typeof roundsArg.value === "number"
    ) {
      saltRounds = roundsArg.value;
    }

    // Return a hashing function
    return (value: unknown) => {
      if (typeof value !== "string") {
        return value;
      }
      return bcrypt.hashSync(value, saltRounds);
    };
  }
}

export class PasswordHasherPlugin<Schema extends SchemaDef = SchemaDef>
  implements RuntimePlugin<Schema>
{
  id = "password-hasher";

  onKyselyQuery: OnKyselyQueryCallback<Schema> = async (args) => {
    // transform the query and hash password fields
    const transformer = new PasswordHasherTransformer(args.schema);
    const transformedQuery = transformer.transformNode(args.query);

    // proceed with the transformed query
    return args.proceed(transformedQuery);
  };
}
```

With the plugin installed on the ORM client, any time you create or update a User record, the password field will be automatically hashed before being stored in the database.

**`main.ts`**

```typescript
import { ZenStackClient } from "@zenstackhq/orm";
import { SqlJsDialect } from "@zenstackhq/orm/dialects/sql.js";
import initSqlJs from "sql.js";
import { PasswordHasherPlugin } from "./password-hasher-plugin";
import { schema } from "./zenstack/schema";

async function main() {
  const SQL = await initSqlJs();

  const db = new ZenStackClient(schema, {
    dialect: new SqlJsDialect({ sqlJs: new SQL.Database() }),
    plugins: [new PasswordHasherPlugin()],
  });

  // push database schema
  await db.$pushSchema();

  console.log("Creating user with plain text password...");
  const user = await db.user.create({
    data: {
      email: "test@zenstack.dev",
      password: "abc123",
    },
  });
  console.log("User created:", user);

  console.log("\nUpdating user password...");
  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { password: "def456" },
  });

  console.log("Updated user:", updatedUser);
}

main();
```
