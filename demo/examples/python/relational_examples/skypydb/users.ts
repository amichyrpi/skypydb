import { mutation } from "skypydb/mutation";
import { query } from "skypydb/query";
import { value } from "skypydb/schemas";

export const createUser = mutation({
  args: {
    name: value.string(),
    email: value.string(),
  },
  handler: (ctx, args) => {
    return ctx.db.insert("users", args);
  },
});

export const listUsers = query({
  handler: (ctx) => {
    return ctx.db.get("users", {
      orderBy: [{ field: "name", direction: "asc" }],
    });
  },
});

export const getUserByEmail = query({
  args: {
    email: value.string(),
  },
  handler: (ctx, args) => {
    return ctx.db.first("users", {
      where: { email: { $eq: args.email } },
    });
  },
});
