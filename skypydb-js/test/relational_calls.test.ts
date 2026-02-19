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

describe("relational callquery/callmutation", () => {
  beforeEach(() => {
    workspace = create_workspace();

    write_skypydb_file(
      workspace,
      "schemas.ts",
      `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  numbers: defineTable({
    label: value.string(),
    amount: value.number()
  })
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "math.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};
import { value } from ${src_import("schemas/values.ts")};

export const sum = query({
  args: { a: value.number(), b: value.number() },
  handler: (_ctx, args) => args.a + args.b
});

export const asyncSum = query({
  args: { a: value.number(), b: value.number() },
  handler: async (_ctx, args) => args.a + args.b
});

export const badWrite = query({
  handler: (ctx) => {
    return (ctx.db).insert("numbers", { label: "illegal", amount: 1 });
  }
});

export const insertNumber = mutation({
  args: { label: value.string(), amount: value.number() },
  handler: (ctx, args) => ctx.db.insert("numbers", args)
});

export const countNumbers = query({
  handler: (ctx) => ctx.db.count("numbers")
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "admin/tools.ts",
      `
import { query } from ${src_import("query/query.ts")};

export const ping = query({
  handler: () => "pong"
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("resolves recursive api paths and preserves sync/async query behavior", async () => {
    const sync_result = callquery(query_api.math.sum, { a: 2, b: 5 });
    expect(sync_result).toBe(7);

    const async_result = callquery(query_api.math.asyncSum, { a: 4, b: 6 });
    expect(async_result).toBeInstanceOf(Promise);
    expect(await resolve_result(async_result as Promise<number>)).toBe(10);

    expect(callquery(query_api.admin.tools.ping)).toBe("pong");
  });

  it("supports callable and immediate mutation invocation styles", async () => {
    const mutate = callmutation(mutation_api.math.insertNumber);
    expect(typeof mutate).toBe("function");

    await resolve_result(mutate({ label: "one", amount: 1 }));
    await resolve_result(
      callmutation(mutation_api.math.insertNumber, { label: "two", amount: 2 }),
    );

    expect(callquery(query_api.math.countNumbers)).toBe(2);
  });

  it("enforces read-only query context", () => {
    expect(() => callquery(query_api.math.badWrite)).toThrow("read-only");
  });
});
