import {
  readFunction,
  writeFunction,
  closewrite,
} from "mesosphere/reactlibrarie";
import { closefunction } from "./mesosphere/deploy";
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

function formatMessage(body: string, secondsLeft: number) {
  return `${body} (This message will be deleted in ${secondsLeft} seconds)`;
}

export const newTemporaryMessage = writeFunction({
  args: {
    user: type.string(),
    body: type.string(),
  },
  handler: async (mesosphere, { body, user }) => {
    const id = await mesosphere.database.add("messages", {
      body: formatMessage(body, 5),
      user,
    });
    await mesosphere.scheduler.rundelay(
      1000,
      closefunction.message.updateTemporaryMessage,
      {
        messageId: id,
        body,
        secondsLeft: 4,
      },
    );
  },
});

export const updateTemporaryMessage = closewrite({
  args: {
    messageId: type.id("messages"),
    body: type.string(),
    secondsLeft: type.number(),
  },
  handler: async (mesosphere, { messageId, body, secondsLeft }) => {
    if (secondsLeft > 0) {
      await mesosphere.database.patch(messageId, {
        body: formatMessage(body, secondsLeft),
      });
      await mesosphere.scheduler.rundelay(
        1000,
        closefunction.message.updateTemporaryMessage,
        {
          messageId,
          body,
          secondsLeft: secondsLeft - 1,
        },
      );
    } else {
      await mesosphere.database.delete(messageId);
    }
  },
});
