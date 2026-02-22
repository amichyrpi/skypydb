import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { build_functions_manifest } from "../src/functions/compiler";

function create_temp_project(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skypydb-functions-"));
  fs.mkdirSync(path.join(root, "skypydb"), { recursive: true });
  return root;
}

describe("functions manifest compiler", () => {
  it("builds endpoints from recursive TypeScript files", () => {
    const project_root = create_temp_project();
    const source_root = path.join(project_root, "skypydb");
    fs.mkdirSync(path.join(source_root, "nested"), { recursive: true });

    fs.writeFileSync(
      path.join(source_root, "users.ts"),
      `
import { mutationFunction, value } from "skypydb";
export const createUser = mutationFunction({
  args: { name: value.string() },
  steps: [{ op: "insert", table: "users", value: { name: "$arg.name" } }],
});
`,
      "utf8",
    );
    fs.writeFileSync(
      path.join(source_root, "nested", "tasks.ts"),
      `
import { queryFunction, value } from "skypydb";
export const listByUser = queryFunction({
  args: { userId: value.string() },
  steps: [{ op: "get", table: "tasks", where: { userId: { $eq: "$arg.userId" } } }],
});
`,
      "utf8",
    );

    const result = build_functions_manifest({ cwd: project_root });
    expect(result.function_count).toBe(2);
    expect(Object.keys(result.manifest.functions)).toEqual(
      expect.arrayContaining(["users.createUser", "nested.tasks.listByUser"]),
    );
    expect(fs.existsSync(result.output_path)).toBe(true);
  });

  it("throws on duplicate endpoint keys", () => {
    const project_root = create_temp_project();
    const source_root = path.join(project_root, "skypydb");
    fs.mkdirSync(path.join(source_root, "users"), { recursive: true });

    const function_body = `
import { queryFunction } from "skypydb";
export const list = queryFunction({
  steps: [{ op: "get", table: "users" }],
});
`;
    fs.writeFileSync(path.join(source_root, "users.ts"), function_body, "utf8");
    fs.writeFileSync(path.join(source_root, "users", "index.ts"), function_body, "utf8");

    expect(() => build_functions_manifest({ cwd: project_root })).toThrow(
      "Duplicate function endpoint 'users.list'",
    );
  });
});

