import { writeFunction, value } from "skypydb/functions";

// Add a new user to the database.
export const createUser = writeFunction({
  // Validators for arguments.
  args: {
    name: value.string(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    const user = { author: args.name, body: args.email };
    const id = await ctx.db.insert("users", user);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("users", id);
  },
});
