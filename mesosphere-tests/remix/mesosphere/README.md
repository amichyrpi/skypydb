# Mesosphere functions directory

Write your Mesosphere functions in this directory.

You can find more information about Mesosphere functions at `https://mesosphere.ahen-studio.com/docs/functions/quickstart`.

A read function that takes two arguments:

```ts
// mesosphere/message.ts
import { readFunction } from "mesosphere/reactlibrarie";
import { type } from "mesosphere/type";

// Get the messages in the top of the list in the database.
export const readMessages = readFunction({
  args: {},
  handler: async (mesosphere) => {
    // Get the messages in the top of the list.
    const messages = await mesosphere.database.get("messages").accumulate();
    return messages;
  },
});
```

Using this read function in a React component:

```ts
import { callread } from "mesosphere/reactlibrarie";
import { api } from "../mesosphere/deploy";

const data = callread(api.message.readMessages, {});
```

A write function:

```ts
// mesosphere/message.ts
import { writeFunction } from "mesosphere/reactlibrarie";
import { type } from "mesosphere/type";

// Add a message to the database.
export const newMessage = writeFunction({
  args: {
    user: type.string(),
    body: type.string(),
  },
  handler: async (mesosphere, args) => {
    await mesosphere.database.add("messages", {
      user: args.user,
      body: args.body,
    });
  },
});
```

Using this write function in a React component:

```ts
import { callwrite } from "mesosphere/reactlibrarie";
import { api } from "../mesosphere/deploy";

const newmessage = callwrite(api.message.newMessage);
function handleButtonPress() {
  newmessage({ user: "Theo", body: "I am Theo." });
}
```

Use the CLI to deploy your functions to the backend. See everything the CLI can do by running `npx mesosphere -h` in your project root directory.
