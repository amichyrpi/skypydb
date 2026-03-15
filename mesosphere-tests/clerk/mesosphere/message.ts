import { readFunction, writeFunction } from "mesosphere/reactlibrarie";
import { type } from "mesosphere/type";

export const newMessage = writeFunction({
  args: {
    body: type.string(),
  },
  handler: async (mesosphere, args) => {
    const isauthenticated = await mesosphere.auth.getuserauthstatue();
    if (!isauthenticated) {
      throw new Error("Unauthenticated call to write function");
    }
    await mesosphere.database.add("messages", {
      user: isauthenticated.name ?? "Unknown",
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
