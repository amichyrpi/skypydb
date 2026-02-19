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

describe("relational filters and pagination", () => {
  beforeEach(() => {
    workspace = create_workspace();

    write_skypydb_file(
      workspace,
      "schemas.ts",
      `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  items: defineTable({
    title: value.string(),
    score: value.number(),
    active: value.boolean(),
    note: value.optional(value.string())
  }).index("by_score", ["score"])
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "filters.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const addItem = mutation({
  handler: (ctx, args) => ctx.db.insert("items", args)
});

export const list = query({
  handler: (ctx, args) => ctx.db.get("items", args)
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("supports core where operators plus orderBy/limit/offset", async () => {
    const seed = [
      { title: "alpha", score: 10, active: true, note: "group-a" },
      { title: "beta", score: 20, active: false, note: "group-b" },
      { title: "gamma", score: 30, active: true, note: "group-a" },
      { title: "delta", score: 40, active: false, note: "group-c" },
      { title: "omega", score: 50, active: true, note: "group-c" },
    ];

    for (const item of seed) {
      await resolve_result(callmutation(mutation_api.filters.addItem, item));
    }

    const eq_active = (await resolve_result(
      callquery(query_api.filters.list, { where: { active: { $eq: true } } }),
    )) as Array<Record<string, unknown>>;
    expect(eq_active.length).toBe(3);

    const ne_title = (await resolve_result(
      callquery(query_api.filters.list, { where: { title: { $ne: "alpha" } } }),
    )) as Array<Record<string, unknown>>;
    expect(ne_title.length).toBe(4);

    const range = (await resolve_result(
      callquery(query_api.filters.list, {
        where: {
          $and: [{ score: { $gt: 15 } }, { score: { $lte: 40 } }],
        },
        orderBy: [{ field: "score", direction: "asc" }],
      }),
    )) as Array<Record<string, unknown>>;
    expect(range.map((item) => item.score)).toEqual([20, 30, 40]);

    const in_result = (await resolve_result(
      callquery(query_api.filters.list, {
        where: { title: { $in: ["alpha", "omega"] } },
      }),
    )) as Array<Record<string, unknown>>;
    expect(in_result.map((item) => item.title).sort()).toEqual([
      "alpha",
      "omega",
    ]);

    const nin_result = (await resolve_result(
      callquery(query_api.filters.list, {
        where: { score: { $nin: [10, 20, 30] } },
      }),
    )) as Array<Record<string, unknown>>;
    expect(nin_result.length).toBe(2);

    const or_contains = (await resolve_result(
      callquery(query_api.filters.list, {
        where: {
          $or: [
            { title: { $contains: "ta" } },
            { note: { $contains: "group-a" } },
          ],
        },
        orderBy: [{ field: "title", direction: "asc" }],
      }),
    )) as Array<Record<string, unknown>>;
    expect(or_contains.map((item) => item.title)).toEqual([
      "alpha",
      "beta",
      "delta",
      "gamma",
    ]);

    const paged = (await resolve_result(
      callquery(query_api.filters.list, {
        orderBy: [{ field: "score", direction: "desc" }],
        limit: 2,
        offset: 1,
      }),
    )) as Array<Record<string, unknown>>;
    expect(paged.map((item) => item.score)).toEqual([40, 30]);
  });
});
