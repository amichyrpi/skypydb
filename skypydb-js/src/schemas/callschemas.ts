import { set_schema_runtime_options } from "../relational/runtime";
import type { RuntimeSchemaOptions } from "../relational/types";

export function callschemas(options: RuntimeSchemaOptions = {}): void {
  set_schema_runtime_options(options);
}
