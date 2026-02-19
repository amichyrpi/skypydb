import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { callmutation, api as mutation_api } from "../src/mutation/callmutation";
import { callquery, api as query_api } from "../src/query/callquery";
import {
  cleanup_workspace,
  create_workspace,
  resolve_result,
  src_import,
  write_skypydb_file,
  type TempWorkspace
} from "./relational_test_utils";

let workspace: TempWorkspace;

describe("relational schema + crud", () => {
  beforeEach(() => {
    workspace = create_workspace();

    write_skypydb_file(
      workspace,
      "schemas.ts",
      `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  users: defineTable({
    name: value.string(),
    age: value.number(),
    isActive: value.boolean(),
    profile: value.object({
      bio: value.string(),
      score: value.optional(value.number())
    })
  }).index("by_name", ["name"]),
  posts: defineTable({
    title: value.string(),
    authorId: value.id("users")
  })
});
`.trim()
    );

    write_skypydb_file(
      workspace,
      "ops.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const createUser = mutation({
  handler: (ctx, args) => ctx.db.insert("users", args)
});

export const createPost = mutation({
  handler: (ctx, args) => ctx.db.insert("posts", args)
});

export const updateUser = mutation({
  handler: (ctx, args) => ctx.db.update("users", { id: args.id, value: args.value })
});

export const deleteUser = mutation({
  handler: (ctx, args) => ctx.db.delete("users", { id: args.id })
});

export const deletePostsByAuthor = mutation({
  handler: (ctx, args) => ctx.db.delete("posts", { where: { authorId: args.authorId } })
});

export const listUsers = query({
  handler: (ctx) => ctx.db.get("users", { orderBy: [{ field: "name", direction: "asc" }] })
});

export const getUser = query({
  handler: (ctx, args) => ctx.db.first("users", { where: { _id: args.id } })
});

export const countUsers = query({
  handler: (ctx) => ctx.db.count("users")
});
`.trim()
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("applies schema, enforces fk rules, stores extras, and performs full-replace updates", async () => {
    const user_id = (await resolve_result(
      callmutation(mutation_api.ops.createUser, {
        name: "Alice",
        age: 30,
        isActive: true,
        profile: { bio: "Engineer", score: 7 },
        nickname: "ally"
      })
    )) as string;

    const users = (await resolve_result(callquery(query_api.ops.listUsers))) as Array<Record<string, unknown>>;
    expect(users.length).toBe(1);
    expect(users[0].nickname).toBe("ally");
    expect((users[0]._extras as Record<string, unknown>).nickname).toBe("ally");
    expect(users[0]._id).toBe(user_id);

    await resolve_result(
      callmutation(mutation_api.ops.createPost, {
        title: "Hello",
        authorId: user_id
      })
    );

    expect(() =>
      callmutation(mutation_api.ops.createPost, {
        title: "Invalid",
        authorId: "missing-user-id"
      })
    ).toThrow("Referenced id");

    expect(() =>
      callmutation(mutation_api.ops.updateUser, {
        id: user_id,
        value: {
          name: "Alice 2",
          age: 31,
          profile: { bio: "Still Engineer", score: 8 }
        }
      })
    ).toThrow("Missing required field");

    await resolve_result(
      callmutation(mutation_api.ops.updateUser, {
        id: user_id,
        value: {
          name: "Alice 2",
          age: 31,
          isActive: false,
          profile: { bio: "Still Engineer", score: 8 },
          alias: "a2"
        }
      })
    );

    const updated_user = (await resolve_result(
      callquery(query_api.ops.getUser, { id: user_id })
    )) as Record<string, unknown>;
    expect(updated_user.name).toBe("Alice 2");
    expect(updated_user.isActive).toBe(false);
    expect((updated_user.profile as Record<string, unknown>).bio).toBe("Still Engineer");
    expect((updated_user._extras as Record<string, unknown>).alias).toBe("a2");
    expect((updated_user._extras as Record<string, unknown>).nickname).toBeUndefined();

    expect(() => callmutation(mutation_api.ops.deleteUser, { id: user_id })).toThrow(
      "Foreign key constraint failed"
    );

    await resolve_result(callmutation(mutation_api.ops.deletePostsByAuthor, { authorId: user_id }));
    const deleted_users = await resolve_result(
      callmutation(mutation_api.ops.deleteUser, { id: user_id })
    );
    expect(deleted_users).toBe(1);
    expect(callquery(query_api.ops.countUsers)).toBe(0);
  });
});
