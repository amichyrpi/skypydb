import { readFunction, value } from "mesosphere/functions";

// Read a document from the database.
// A table is automatically created when you write a write function; it is created with the name of the file in which the function is written.
export const readDatabase = readFunction({
  // Validators for arguments.
  args: {
    name: value.string(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    const documents = await ctx.db.read("users").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.name, args.email);

    // Return a value from your mutation.
    return documents;
  },
});
