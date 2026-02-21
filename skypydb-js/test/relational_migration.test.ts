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
  legacyUsers: defineTable({
    name: value.string(),
    age: value.number()
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
    age: value.number(),
    level: value.number()
  })
});
`.trim(),
  );
}

function write_schema_v2_missing_defaults(
  current_workspace: TempWorkspace,
): void {
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

export const createLegacyUser = mutation({
  handler: (ctx, args) => ctx.db.insert("legacyUsers", args)
});

export const createLegacyPayload = mutation({
  handler: (ctx, args) => ctx.db.insert("legacy", args)
});

export const listUsers = query({
  handler: (ctx) => ctx.db.get("users", { orderBy: [{ field: "fullName", direction: "asc" }] })
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("migrates data with explicit mapping/defaults, creates backup, and keeps unmapped removed tables unmanaged", async () => {
    await resolve_result(
      callmutation(mutation_api.migrate.createLegacyUser, {
        name: "Before",
        age: 20,
        nickname: "bf",
      }),
    );
    await resolve_result(
      callmutation(mutation_api.migrate.createLegacyPayload, {
        payload: "stays-on-disk",
      }),
    );

    write_schema_v2(workspace);

    callschemas({
      migrations: {
        tables: {
          users: {
            from: "legacyUsers",
            fieldMap: {
              fullName: "name",
            },
            defaults: {
              level: 1,
            },
          },
        },
      },
    });

    const users = (await resolve_result(
      callquery(query_api.migrate.listUsers),
    )) as Array<Record<string, unknown>>;

    expect(users.length).toBe(1);
    expect(users[0].fullName).toBe("Before");
    expect(users[0].age).toBe(20);
    expect(users[0].level).toBe(1);
    expect((users[0]._extras as Record<string, unknown>).nickname).toBe("bf");

    const db_path = path.join(workspace.root, "skypydb", "reactive.db");
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
      expect(legacy_table?.name).toBe("legacy");

      const managed_rows = connection
        .prepare(
          "SELECT table_name FROM _skypydb_schema_meta WHERE table_name='legacy'",
        )
        .all() as Array<{ table_name: string }>;
      expect(managed_rows).toEqual([]);

      const legacy_users_count = connection
        .prepare("SELECT COUNT(*) AS count_value FROM [legacyUsers]")
        .get() as { count_value: number };
      expect(Number(legacy_users_count.count_value)).toBe(0);
    } finally {
      connection.close();
    }
  });

  it("fails migration when required target fields are not mapped and no default is provided", async () => {
    await resolve_result(
      callmutation(mutation_api.migrate.createLegacyUser, {
        name: "NoDefault",
        age: 10,
      }),
    );

    write_schema_v2_missing_defaults(workspace);
    callschemas({
      migrations: {
        tables: {
          users: {
            from: "legacyUsers",
            fieldMap: {
              fullName: "name",
            },
          },
        },
      },
    });

    expect(() => callquery(query_api.migrate.listUsers)).toThrow(
      "Missing required field 'users.level'",
    );
  });

  it("rejects legacy destructive schema option", () => {
    expect(() =>
      callschemas({
        allowDestructiveSchemaChanges: true,
      } as unknown as any),
    ).toThrow("no longer supported");
  });
});
