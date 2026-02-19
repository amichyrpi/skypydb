import { ValidationError } from "../errors";
import { MUTATION_MARKER } from "../relational/markers";
import type { ArgsDefinition, MutationDefinition } from "../relational/types";

type MutationConfig = {
  args?: ArgsDefinition;
  handler: MutationDefinition["handler"];
};

export function mutation(config: MutationConfig): MutationDefinition {
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new ValidationError("mutation(...) requires a configuration object.");
  }
  if (typeof config.handler !== "function") {
    throw new ValidationError("mutation(...) requires a handler function.");
  }

  return {
    [MUTATION_MARKER]: true,
    args: config.args,
    handler: config.handler,
  };
}
