import type { FunctionKind } from "../functions/types";

export type FunctionVisibility = "public" | "internal";

export type FunctionReference<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
  TKind extends FunctionKind = FunctionKind,
  TEndpoint extends string = string,
> = {
  readonly __skypydbReference: true;
  readonly kind: TKind;
  readonly endpoint: TEndpoint;
  readonly __args?: TArgs;
  readonly __result?: TResult;
};

export type FunctionExporter<
  TModules,
  TVisibility extends FunctionVisibility = "public",
> = {
  readonly modules: TModules;
  readonly visibility: TVisibility;
};
