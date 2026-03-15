import { readFunction, writeFunction } from "mesosphere/reactlibrarie";
import { closewrite } from "mesosphere/reactlibrarie";
import { type } from "mesosphere/type";

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

export const readMessages = readFunction({
  args: {},
  handler: async (mesosphere) => {
    const messages = await mesosphere.database.get("messages").accumulate();
    return messages;
  },
});

export const clearallmessages = closewrite({
  args: {},
  handler: async (mesosphere) => {
    for (const message of await mesosphere.database
      .get("messages")
      .accumulate()) {
      await mesosphere.database.delete(message._id);
    }
  },
});
