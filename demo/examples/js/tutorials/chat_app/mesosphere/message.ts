import {
  readFunction,
  writeFunction,
  uploadFunction,
} from "mesosphere/reactlibrarie";
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

// Upload a file to the database.
export const uploadFile = uploadFunction({
  args: {
    storageId: type.id("_storage"), // This is the id of the file in the storage.
    user: type.string(),
  },
  handler: async (mesosphere, args) => {
    await mesosphere.storage.upload("messages", {
      body: args.storageId,
      user: args.user,
      // You can specify the file type by using:
      // fileType: "image/png",
    });
  },
});

// Get the messages in the top of the list in the database.
export const readMessages = readFunction({
  args: {},
  handler: async (mesosphere) => {
    // Get the messages in the top of the list.
    const messages = await mesosphere.database.read("messages");
    return messages;
  },
});
