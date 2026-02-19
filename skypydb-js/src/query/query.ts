import { ValidationError } from "../errors";
import { QUERY_MARKER } from "../relational/markers";
import type { ArgsDefinition, QueryDefinition } from "../relational/types";

type QueryConfig = {
  args?: ArgsDefinition;
  handler: QueryDefinition["handler"];
};

export function query(config: QueryConfig): QueryDefinition {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new ValidationError("query(...) requires a configuration object.");
  }
  if (typeof config.handler !== "function") {
    throw new ValidationError("query(...) requires a handler function.");
  }

  return {
    [QUERY_MARKER]: true,
    args: config.args,
    handler: config.handler
  };
}
