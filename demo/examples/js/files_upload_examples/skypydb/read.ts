import { readFunction, value } from "skypydb/functions";

// Read image messages for React pages.
export const readImageMessages = readFunction({
  handler: async (ctx) => {
    const messages = await ctx.db.read("messages").collect();
    return messages;
  },
});

// Resolve a storage id to a public file URL.
export const getImageUrl = readFunction({
  args: {
    storageId: value.id("_storage"),
  },

  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
