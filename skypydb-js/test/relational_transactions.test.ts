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

describe("relational transactions", () => {
  beforeEach(() => {
    workspace = create_workspace();

    write_skypydb_file(
      workspace,
      "schemas.ts",
      `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  logs: defineTable({
    label: value.string(),
    amount: value.number()
  })
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "transactions.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const writeBatch = mutation({
  handler: (ctx, args) => {
    return ctx.db.transaction((tx) => {
      tx.insert("logs", { label: "first", amount: 1 });
      tx.insert("logs", { label: "second", amount: 2 });
      if (args.fail === true) {
        throw new Error("forced failure");
      }
      return tx.count("logs");
    });
  }
});

export const countLogs = query({
  handler: (ctx) => ctx.db.count("logs")
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("commits successful transaction and rolls back on error", async () => {
    const first_count = await resolve_result(
      callmutation(mutation_api.transactions.writeBatch, { fail: false }),
    );
    expect(first_count).toBe(2);
    expect(callquery(query_api.transactions.countLogs)).toBe(2);

    expect(() =>
      callmutation(mutation_api.transactions.writeBatch, { fail: true }),
    ).toThrow("forced failure");

    expect(callquery(query_api.transactions.countLogs)).toBe(2);
  });
});
