import { writeFunction, value } from "mesosphere/functions";

// Create an upload URL for file upload.
export const createUploadUrl = writeFunction({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.createUploadUrl();
  },
});

// Store an uploaded image by referencing its storage id.
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
