## Relational Example (JavaScript/TypeScript)

This example shows how to:

1. Define relational tables in `skypydb/schemas.ts`
2. Create query/mutation functions in `skypydb/*.ts`
3. Use a client script with `callquery`, `callmutation`, and `api.*`

### Structure

- `client.ts`: Example client that calls your functions
- `skypydb/schemas.ts`: Database schema
- `skypydb/users.ts`: User queries/mutations
- `skypydb/tasks.ts`: Task queries/mutations

### Run

From the repo root:

```bash
npx tsx demo/examples/js/relational_examples/client.ts
```

The client sets `process.cwd()` to this example folder so runtime scanning resolves the local `skypydb/` directory.
This demo imports directly from local `skypydb-js/src` entry points, so no package publish/install step is needed.

### Migration map example

Use `callschemas` to declare non-destructive table migrations:

```ts
callschemas({
  migrations: {
    tables: {
      users: {
        from: "legacy_users",
        fieldMap: {
          fullName: "name",
        },
        defaults: {
          level: 0,
        },
      },
    },
  },
});
```

### Move rows between tables

Inside a mutation handler:

```ts
ctx.db.move("todo", {
  toTable: "done",
  where: { isCompleted: true },
  fieldMap: { completedAt: "updatedAt" },
});
```
