import type { FunctionKind } from "../functions/types";

export type FunctionVisibility = "public" | "internal";

export const MESOSPHERE_FUNCTION_REFERENCE: unique symbol = Symbol.for(
  "mesosphere.function.reference",
) as never;
export const MESOSPHERE_FUNCTION_ENDPOINT: unique symbol = Symbol.for(
  "mesosphere.function.endpoint",
) as never;
export const MESOSPHERE_FUNCTION_TO_STRING: unique symbol = Symbol.for(
  "mesosphere.function.toString",
) as never;

export type FunctionReference<
  TArgs extends Record<string, unknown> = Record<string, unknown>,
  TResult = unknown,
  TKind extends FunctionKind = FunctionKind,
  TEndpoint extends string = string,
> = {
  readonly [MESOSPHERE_FUNCTION_REFERENCE]: true;
  readonly [MESOSPHERE_FUNCTION_ENDPOINT]: TEndpoint;
  readonly [MESOSPHERE_FUNCTION_TO_STRING]?: () => TEndpoint;
  readonly kind: TKind;
  readonly __mesosphereReference?: true;
  readonly endpoint?: TEndpoint;
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
