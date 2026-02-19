import { mutation } from "skypydb/mutation";
import { value } from "skypydb/values";

// Create a new task with the given text
export const createTask = mutation({
  args: { text: value.string() },
  handler: async (ctx, args) => {
    const newTaskId = await ctx.db.insert("tasks", { text: args.text });
    // const newTaskId = await ctx.db.delete("tasks", { text: args.text });
    // const newTaskId = await ctx.db.update("tasks", { text: args.text });
    return newTaskId;
  },
});