import type {
  FunctionArgsDefinition,
  FunctionHandler,
  ReadFunctionDefinition,
} from "./types";

export type ReadFunctionOptions<
  TArgs extends FunctionArgsDefinition,
  TResult,
> = {
  args?: TArgs;
  handler: FunctionHandler<TArgs, TResult>;
};

export function readFunction<
  TArgs extends FunctionArgsDefinition = FunctionArgsDefinition,
  TResult = unknown,
>(
  options: ReadFunctionOptions<TArgs, TResult>,
): ReadFunctionDefinition<TArgs, TResult> {
  const args = (options.args ?? {}) as TArgs;
  return {
    __skypydbFunction: true,
    kind: "query",
    args,
    handler: options.handler,
  };
}
