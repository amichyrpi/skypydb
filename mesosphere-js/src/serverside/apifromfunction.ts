import type {
  FunctionArgsDefinition,
  FunctionKind,
  LooseArgs,
} from "../functions/types";
import type { FunctionReference } from "./functionexporter";

type EndpointFor<
  TModule extends string,
  TName extends string,
> = `${TModule}.${TName}`;

type FunctionDefinitionLike = {
  __mesosphereFunction: true;
  kind: FunctionKind;
  args: FunctionArgsDefinition;
  handler: (...args: any[]) => unknown;
};

type DefinitionToReference<
  TDefinition extends FunctionDefinitionLike,
  TEndpoint extends string,
> = FunctionReference<
  LooseArgs<TDefinition["args"]>,
  Awaited<ReturnType<TDefinition["handler"]>>,
  TDefinition["kind"],
  TEndpoint
>;

type ModuleToApi<
  TModuleName extends string,
  TModuleExports extends Record<string, unknown>,
> = {
  [TExportName in keyof TModuleExports as TModuleExports[TExportName] extends FunctionDefinitionLike
    ? TExportName
    : never]: TModuleExports[TExportName] extends FunctionDefinitionLike
    ? DefinitionToReference<
        TModuleExports[TExportName],
        EndpointFor<TModuleName, Extract<TExportName, string>>
      >
    : never;
};

export type ApiFromFunction<TModules extends Record<string, unknown>> = {
  [TModuleName in keyof TModules]: TModules[TModuleName] extends Record<
    string,
    unknown
  >
    ? ModuleToApi<Extract<TModuleName, string>, TModules[TModuleName]>
    : never;
};
