import { readFunction, writeFunction } from "mesosphere/reactlibrarie";
import { dbDoc } from "./deploy";
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
  handler: async (mesosphere): Promise<dbDoc<"messages">[]> => {
    const messages = await mesosphere.database.get("messages").accumulate();
    return messages;
  },
});
