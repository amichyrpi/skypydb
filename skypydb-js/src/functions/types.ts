import type { SchemaFieldDefinition } from "../types";

export type FunctionKind = "query" | "mutation";

export type FunctionArgsDefinition = Record<string, SchemaFieldDefinition>;

export type LooseArgs<TArgs extends FunctionArgsDefinition> = {
  [K in keyof TArgs]: unknown;
};

export type DbReadCursor = {
  collect(): Promise<unknown[]>;
};

export type DbApi = {
  read(table: string): DbReadCursor;
  insert(table: string, value: unknown): Promise<string>;
  get(table: string, id: string): Promise<unknown | null>;
};

export type FunctionContext = {
  db: DbApi;
};

export type FunctionHandler<TArgs extends FunctionArgsDefinition, TResult> = (
  ctx: FunctionContext,
  args: LooseArgs<TArgs>,
) => Promise<TResult> | TResult;

export type FunctionDefinition<
  TKind extends FunctionKind,
  TArgs extends FunctionArgsDefinition,
  TResult,
> = {
  __skypydbFunction: true;
  kind: TKind;
  args: TArgs;
  handler: FunctionHandler<TArgs, TResult>;
};

export type ReadFunctionDefinition<
  TArgs extends FunctionArgsDefinition = FunctionArgsDefinition,
  TResult = unknown,
> = FunctionDefinition<"query", TArgs, TResult>;

export type WriteFunctionDefinition<
  TArgs extends FunctionArgsDefinition = FunctionArgsDefinition,
  TResult = unknown,
> = FunctionDefinition<"mutation", TArgs, TResult>;

export type AnyFunctionDefinition =
  | ReadFunctionDefinition<FunctionArgsDefinition, unknown>
  | WriteFunctionDefinition<FunctionArgsDefinition, unknown>;
