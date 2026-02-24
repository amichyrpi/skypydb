import type {
  FunctionArgsDefinition,
  FunctionHandler,
  WriteFunctionDefinition,
} from "./types";

export type WriteFunctionOptions<
  TArgs extends FunctionArgsDefinition,
  TResult,
> = {
  args?: TArgs;
  handler: FunctionHandler<TArgs, TResult>;
};

export function writeFunction<
  TArgs extends FunctionArgsDefinition = FunctionArgsDefinition,
  TResult = unknown,
>(
  options: WriteFunctionOptions<TArgs, TResult>,
): WriteFunctionDefinition<TArgs, TResult> {
  const args = (options.args ?? {}) as TArgs;
  return {
    __mesosphereFunction: true,
    kind: "mutation",
    args,
    handler: options.handler,
  };
}
