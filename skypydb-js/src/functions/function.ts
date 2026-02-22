import type {
  FunctionDefinition,
  MutationFunctionOptions,
  QueryFunctionOptions,
} from "./types";

export function queryFunction(options: QueryFunctionOptions): FunctionDefinition {
  return {
    __skypydbFunction: true,
    kind: "query",
    args: options.args ?? {},
    steps: options.steps,
  };
}

export function mutationFunction(
  options: MutationFunctionOptions,
): FunctionDefinition {
  return {
    __skypydbFunction: true,
    kind: "mutation",
    args: options.args ?? {},
    steps: options.steps,
  };
}

export function isFunctionDefinition(value: unknown): value is FunctionDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.__skypydbFunction === true &&
    (record.kind === "query" || record.kind === "mutation") &&
    typeof record.args === "object" &&
    Array.isArray(record.steps)
  );
}
