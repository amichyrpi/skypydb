# Skypydb functions directory

Write your Relational functions here.
Look at https://docs.ahen-studio.com/relational/functions for more information.

A read function that have two arguments:

```ts
// skypydb/read.ts
import { readFunction, value } from "skypydb/functions";

// Read a document from the database.
// A table is automatically created when you write a write function; it is created with the name of the file in which the function is written.
export const readDatabase = readFunction({
  // Validators for arguments.
  args: {
    name: value.number(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    const documents = await ctx.db.read("users").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.name, args.email);

    // Return a value from your mutation.
    return documents;
  },
});
```

Using this read function in a React component:

```ts
const client = httpClient({
  api_url: process.env.SKYPYDB_API_URL,
  api_key: process.env.SKYPYDB_API_KEY,
});

const reader = callread(api.read.readDatabase, client, {
  name: "Theo",
  email: "theo@example.com",
});
```

A write function:

```ts
// skypydb/users.ts
import { writeFunction, value } from "skypydb/functions";

// Add a new user to the database.
export const createUser = writeFunction({
  // Validators for arguments.
  args: {
    name: value.string(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    const user = { author: args.name, body: args.email };
    const id = await ctx.db.insert("users", user);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("users", id);
  },
});
```

Using this write function in a React component:

```ts
const client = httpClient({
  api_url: process.env.SKYPYDB_API_URL,
  api_key: process.env.SKYPYDB_API_KEY,
});

const writer = callwrite(api.users.createUser, client, {
  name: "Theo",
  email: "theo@example.com",
});
```

Use the Skypydb CLI to push your functions to the server (cloud or self-hosted).
See everything the Skypydb CLI can do by running `npx skypydb --help` in your project root directory.
To learn more, see the docs at `https://docs.ahen-studio.com/`.
