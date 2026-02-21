import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  handle_bridge_request,
  resolve_api_reference,
  type BridgeWorkerState,
} from "../src/relational/python_bridge_worker";
import {
  cleanup_workspace,
  create_workspace,
  src_import,
  write_skypydb_file,
  type TempWorkspace,
} from "./relational_test_utils";

let workspace: TempWorkspace;

describe("relational python bridge worker", () => {
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
  })
});
`.trim(),
    );

    write_skypydb_file(
      workspace,
      "bridge.ts",
      `
import { mutation } from ${src_import("mutation/mutation.ts")};
import { query } from ${src_import("query/query.ts")};

export const createUser = mutation({
  handler: (ctx, args) => ctx.db.insert("users", args)
});

export const listUsers = query({
  handler: (ctx) => ctx.db.get("users", { orderBy: [{ field: "name", direction: "asc" }] })
});
`.trim(),
    );
  });

  afterEach(() => {
    cleanup_workspace(workspace);
  });

  it("resolves endpoint tokens from string paths", () => {
    const reference = resolve_api_reference("bridge.createUser");
    expect(reference).toBeTypeOf("object");
    expect(() => resolve_api_reference("")).toThrow(
      "Endpoint must be a non-empty string",
    );
  });

  it("supports init, callschemas, callmutation, and callquery actions", async () => {
    const state: BridgeWorkerState = {
      initialized: false,
      project_root: null,
    };

    const init_response = await handle_bridge_request(
      {
        id: "1",
        action: "init",
        payload: { projectRoot: workspace.root },
      },
      state,
    );
    expect(init_response.ok).toBe(true);

    const schema_response = await handle_bridge_request(
      {
        id: "2",
        action: "callschemas",
        payload: { options: {} },
      },
      state,
    );
    expect(schema_response.ok).toBe(true);

    const mutation_response = await handle_bridge_request(
      {
        id: "3",
        action: "callmutation",
        payload: { endpoint: "bridge.createUser", args: { name: "Alice" } },
      },
      state,
    );
    expect(mutation_response.ok).toBe(true);

    const query_response = await handle_bridge_request(
      {
        id: "4",
        action: "callquery",
        payload: { endpoint: "bridge.listUsers", args: {} },
      },
      state,
    );

    expect(query_response.ok).toBe(true);
    if (query_response.ok) {
      expect(Array.isArray(query_response.result)).toBe(true);
      const users = query_response.result as Array<Record<string, unknown>>;
      expect(users.length).toBe(1);
      expect(users[0].name).toBe("Alice");
    }
  });

  it("returns protocol errors for unknown endpoints", async () => {
    const state: BridgeWorkerState = {
      initialized: false,
      project_root: null,
    };

    await handle_bridge_request(
      {
        id: "1",
        action: "init",
        payload: { projectRoot: workspace.root },
      },
      state,
    );

    const response = await handle_bridge_request(
      {
        id: "2",
        action: "callquery",
        payload: { endpoint: "bridge.missing", args: {} },
      },
      state,
    );

    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.message).toContain("was not found");
    }
  });
});
