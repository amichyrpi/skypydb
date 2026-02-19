import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __reset_runtime_for_tests } from "../src/relational/runtime";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(TEST_DIR, "../src");

function to_posix(file_path: string): string {
  return file_path.replace(/\\/g, "/");
}

export function src_import(module_relative_path: string): string {
  const absolute = path.resolve(SRC_ROOT, module_relative_path);
  return JSON.stringify(to_posix(absolute));
}

export type TempWorkspace = {
  root: string;
  previous_cwd: string;
};

export function create_workspace(): TempWorkspace {
  const previous_cwd = process.cwd();
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "skypydb-js-relational-"));
  fs.mkdirSync(path.join(root, "skypydb"), { recursive: true });
  process.chdir(root);
  return { root, previous_cwd };
}

export function cleanup_workspace(workspace: TempWorkspace): void {
  __reset_runtime_for_tests();
  process.chdir(workspace.previous_cwd);
  fs.rmSync(workspace.root, { recursive: true, force: true });
}

export function write_skypydb_file(
  workspace: TempWorkspace,
  relative_path: string,
  content: string,
): string {
  const absolute = path.join(workspace.root, "skypydb", relative_path);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
  return absolute;
}

export async function resolve_result<T>(value: T | Promise<T>): Promise<T> {
  if (
    value &&
    typeof (value as unknown as { then?: unknown }).then === "function"
  ) {
    return value as Promise<T>;
  }
  return value as T;
}
