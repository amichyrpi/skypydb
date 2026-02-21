import { ValidationError } from "../errors";
import { set_schema_runtime_options } from "../relational/runtime";
import type { RuntimeSchemaOptions } from "../relational/types";

export function callschemas(options: RuntimeSchemaOptions = {}): void {
  if (
    typeof options !== "object" ||
    options === null ||
    Array.isArray(options)
  ) {
    throw new ValidationError("callschemas(...) expects an options object.");
  }

  if (
    Object.prototype.hasOwnProperty.call(
      options as Record<string, unknown>,
      "allowDestructiveSchemaChanges",
    )
  ) {
    throw new ValidationError(
      "allowDestructiveSchemaChanges is no longer supported. Use callschemas({ migrations: { tables: { ... } } }) instead.",
    );
  }

  set_schema_runtime_options(options);
}
