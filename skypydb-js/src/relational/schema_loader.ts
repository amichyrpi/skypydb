import fs from "node:fs";
import path from "node:path";
import { SchemaLoadError } from "../errors";
import { SCHEMA_MARKER } from "./markers";
import { load_module_exports } from "./module_loader";
import type { SchemaDefinition } from "./types";

export function schema_file_path(project_root = process.cwd()): string {
  return path.join(project_root, "skypydb", "schemas.ts");
}

export function is_schema_definition(
  value: unknown,
): value is SchemaDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return SCHEMA_MARKER in value;
}

export function load_schema(project_root = process.cwd()): SchemaDefinition {
  const schema_path = schema_file_path(project_root);
  if (!fs.existsSync(schema_path)) {
    throw new SchemaLoadError(
      `Schema file not found at '${schema_path}'. Create skypydb/schemas.ts with defineSchema(...).`,
    );
  }

  const loaded = load_module_exports(schema_path, "schema");
  const candidate = (loaded.default ?? loaded.schema) as unknown;
  if (!is_schema_definition(candidate)) {
    throw new SchemaLoadError(
      "Schema module must export default defineSchema({...}) or named export 'schema'.",
    );
  }
  return candidate;
}
