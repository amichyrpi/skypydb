import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  callmutation,
  api as mutation_api,
} from "../src/mutation/callmutation";
import { callquery, api as query_api } from "../src/query/callquery";
import {
  cleanup_workspace,
  create_workspace,
  resolve_result,
  src_import,
  write_skypydb_file,
  type TempWorkspace,
} from "./relational_test_utils";

let workspace: TempWorkspace;

describe("relational move", () => {
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
    name: value.string()
  }),
  todo: defineTable({
    title: value.string(),
    userId: value.id("users"),
    isDone: value.boolean()
  }),
  done: defineTable({
    title: value.string(),
    ownerId: value.id("users"),
    completed: value.boolean()
  }),
  todoRefs: defineTable({
    todoId: value.id("todo")
  })
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "moves.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const createUser = mutation({
  handler: (ctx, args) => ctx.db.insert("users", args)
});

export const createTodo = mutation({
  handler: (ctx, args) => ctx.db.insert("todo", args)
});

export const createTodoRef = mutation({
  handler: (ctx, args) => ctx.db.insert("todoRefs", args)
});

export const insertDoneWithId = mutation({
  handler: (ctx, args) => ctx.db.insert("done", args)
});

export const moveOne = mutation({
  handler: (ctx, args) =>
    ctx.db.move("todo", {
      toTable: "done",
      id: args.id,
      fieldMap: {
        ownerId: "userId",
        completed: "isDone"
      }
    })
});

export const moveByUser = mutation({
  handler: (ctx, args) =>
    ctx.db.move("todo", {
      toTable: "done",
      where: { userId: args.userId },
      fieldMap: {
        ownerId: "userId",
        completed: "isDone"
      }
    })
});

export const countTodo = query({
  handler: (ctx) => ctx.db.count("todo")
});

export const countDone = query({
  handler: (ctx) => ctx.db.count("done")
});

export const listDone = query({
  handler: (ctx) => ctx.db.get("done", { orderBy: [{ field: "title", direction: "asc" }] })
});

export const badMove = query({
  handler: (ctx) => (ctx.db).move("todo", { toTable: "done", where: { } })
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("moves rows by id and preserves id", async () => {
    const user_id = (await resolve_result(
      callmutation(mutation_api.moves.createUser, { name: "U1" }),
    )) as string;
    const todo_id = (await resolve_result(
      callmutation(mutation_api.moves.createTodo, {
        title: "A",
        userId: user_id,
        isDone: true,
      }),
    )) as string;

    const moved = await resolve_result(
      callmutation(mutation_api.moves.moveOne, { id: todo_id }),
    );
    expect(moved).toBe(1);
    expect(callquery(query_api.moves.countTodo)).toBe(0);
    expect(callquery(query_api.moves.countDone)).toBe(1);

    const done_rows = (await resolve_result(
      callquery(query_api.moves.listDone),
    )) as Array<Record<string, unknown>>;
    expect(done_rows[0]._id).toBe(todo_id);
    expect(done_rows[0].ownerId).toBe(user_id);
    expect(done_rows[0].completed).toBe(true);
  });

  it("moves rows by where selector", async () => {
    const user_id = (await resolve_result(
      callmutation(mutation_api.moves.createUser, { name: "U2" }),
    )) as string;

    await resolve_result(
      callmutation(mutation_api.moves.createTodo, {
        title: "A",
        userId: user_id,
        isDone: false,
      }),
    );
    await resolve_result(
      callmutation(mutation_api.moves.createTodo, {
        title: "B",
        userId: user_id,
        isDone: true,
      }),
    );

    const moved = await resolve_result(
      callmutation(mutation_api.moves.moveByUser, { userId: user_id }),
    );
    expect(moved).toBe(2);
    expect(callquery(query_api.moves.countTodo)).toBe(0);
    expect(callquery(query_api.moves.countDone)).toBe(2);
  });

  it("fails on id conflict and rolls back", async () => {
    const user_id = (await resolve_result(
      callmutation(mutation_api.moves.createUser, { name: "U3" }),
    )) as string;
    const fixed_id = "fixed-id";

    await resolve_result(
      callmutation(mutation_api.moves.createTodo, {
        _id: fixed_id,
        title: "A",
        userId: user_id,
        isDone: true,
      }),
    );
    await resolve_result(
      callmutation(mutation_api.moves.insertDoneWithId, {
        _id: fixed_id,
        title: "Existing",
        ownerId: user_id,
        completed: true,
      }),
    );

    expect(() =>
      callmutation(mutation_api.moves.moveOne, { id: fixed_id }),
    ).toThrow("id already exists");
    expect(callquery(query_api.moves.countTodo)).toBe(1);
    expect(callquery(query_api.moves.countDone)).toBe(1);
  });

  it("rolls back when source delete is blocked by restrict fk", async () => {
    const user_id = (await resolve_result(
      callmutation(mutation_api.moves.createUser, { name: "U4" }),
    )) as string;
    const todo_id = (await resolve_result(
      callmutation(mutation_api.moves.createTodo, {
        title: "A",
        userId: user_id,
        isDone: true,
      }),
    )) as string;

    await resolve_result(
      callmutation(mutation_api.moves.createTodoRef, { todoId: todo_id }),
    );

    expect(() =>
      callmutation(mutation_api.moves.moveOne, { id: todo_id }),
    ).toThrow("Foreign key constraint failed");
    expect(callquery(query_api.moves.countTodo)).toBe(1);
    expect(callquery(query_api.moves.countDone)).toBe(0);
  });

  it("keeps query context read-only for move", () => {
    expect(() => callquery(query_api.moves.badMove)).toThrow("read-only");
  });
});
