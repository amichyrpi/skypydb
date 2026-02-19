import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  callmutation,
  api as mutation_api,
} from "../src/mutation/callmutation";
import { callquery, api as query_api } from "../src/query/callquery";
import { callschemas } from "../src/schemas/callschemas";
import {
  cleanup_workspace,
  create_workspace,
  resolve_result,
  src_import,
  write_skypydb_file,
  type TempWorkspace,
} from "./relational_test_utils";

let workspace: TempWorkspace;

function write_schema_v1(current_workspace: TempWorkspace): void {
  write_skypydb_file(
    current_workspace,
    "schemas.ts",
    `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  users: defineTable({
    name: value.string()
  }),
  legacy: defineTable({
    payload: value.string()
  })
});
`.trim(),
  );
}

function write_schema_v2(current_workspace: TempWorkspace): void {
  write_skypydb_file(
    current_workspace,
    "schemas.ts",
    `
import { defineSchema, defineTable } from ${src_import("schemas/schemas.ts")};
import { value } from ${src_import("schemas/values.ts")};

export default defineSchema({
  users: defineTable({
    fullName: value.string(),
    level: value.number()
  })
});
`.trim(),
  );
}

describe("relational schema migration", () => {
  beforeEach(() => {
    workspace = create_workspace();
    write_schema_v1(workspace);

    write_skypydb_file(
      workspace,
      "migrate.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const createUser = mutation({
  handler: (ctx, args) => ctx.db.insert("users", args)
});

export const listUsers = query({
  handler: (ctx) => ctx.db.get("users")
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("throws on mismatch without destructive flag, then recreates with backup when enabled", async () => {
    await resolve_result(
      callmutation(mutation_api.migrate.createUser, { name: "Before" }),
    );
    const db_path = path.join(workspace.root, "skypydb", "reactive.db");
    expect(fs.existsSync(db_path)).toBe(true);

    write_schema_v2(workspace);

    expect(() => callquery(query_api.migrate.listUsers)).toThrow(
      "Schema mismatch detected",
    );

    callschemas({ allowDestructiveSchemaChanges: true });
    const users_after = (await resolve_result(
      callquery(query_api.migrate.listUsers),
    )) as Array<unknown>;
    expect(users_after).toEqual([]);

    const skypydb_dir = path.join(workspace.root, "skypydb");
    const backups = fs
      .readdirSync(skypydb_dir)
      .filter(
        (file_name) =>
          file_name.startsWith("reactive.backup-") && file_name.endsWith(".db"),
      );
    expect(backups.length).toBeGreaterThan(0);

    const connection = new Database(db_path);
    try {
      const legacy_table = connection
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='legacy'",
        )
        .get() as { name: string } | undefined;
      expect(legacy_table).toBeUndefined();
    } finally {
      connection.close();
    }
  });
});
