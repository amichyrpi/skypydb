import { readFunction, value, writeFunction } from "mesosphere/functions";

export const list = readFunction({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.read("messages").collect();
    return messages;
  },
});

export const send = writeFunction({
  args: {
    body: value.string(),
    author: value.string(),
  },
  handler: async (ctx, args) => {
    const message = {
      body: args.body,
      author: args.author,
      format: "text",
    };
    const id = await ctx.db.insert("messages", message);
    return await ctx.db.get("messages", id);
  },
});

export const createUploadUrl = writeFunction({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.createUploadUrl();
  },
});

export const sendImage = writeFunction({
  args: {
    storageId: value.id("_storage"),
    author: value.string(),
  },
  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    const message = {
      body: args.storageId,
      author: args.author,
      format: "image",
      imageUrl,
    };
    const id = await ctx.db.insert("messages", message);
    return await ctx.db.get("messages", id);
  },
});
