import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import type { ModuleKind, ScriptTarget } from "typescript";
import { FunctionResolutionError, SchemaLoadError } from "../errors";

type LoaderContext = "schema" | "function";

type TypeScriptModule = {
  transpileModule: (
    input: string,
    options: {
      compilerOptions: {
        module: ModuleKind;
        target: ScriptTarget;
        esModuleInterop: boolean;
        moduleResolution: number;
      };
      fileName: string;
      reportDiagnostics: boolean;
    },
  ) => { outputText: string };
  ModuleKind: Record<string, ModuleKind>;
  ScriptTarget: Record<string, ScriptTarget>;
  ModuleResolutionKind: Record<string, number>;
};

const runtime_require = createRequire(
  path.join(process.cwd(), "__skypydb_loader__.cjs"),
);

let ts_loader_ready = false;

function get_error(context: LoaderContext, message: string): Error {
  if (context === "schema") {
    return new SchemaLoadError(message);
  }
  return new FunctionResolutionError(message);
}

function ensure_ts_loader(context: LoaderContext): void {
  if (ts_loader_ready) {
    return;
  }

  const extensions = (runtime_require as NodeRequire).extensions;
  if (!extensions) {
    throw get_error(context, "Unable to register a TypeScript module loader.");
  }

  // If the current runtime (e.g. tsx/ts-node) already registered a TS loader,
  // reuse it instead of requiring local TypeScript from node_modules.
  if (typeof extensions[".ts"] === "function") {
    ts_loader_ready = true;
    return;
  }

  let ts_module: TypeScriptModule;
  try {
    ts_module = runtime_require("typescript") as TypeScriptModule;
  } catch {
    throw get_error(
      context,
      "TypeScript runtime support is not available. Install TypeScript or run with tsx/ts-node loader.",
    );
  }

  const hook = (module: NodeModule, filename: string): void => {
    const source = fs.readFileSync(filename, "utf8");
    const transpiled = ts_module.transpileModule(source, {
      compilerOptions: {
        module: ts_module.ModuleKind.CommonJS,
        target: ts_module.ScriptTarget.ES2022,
        esModuleInterop: true,
        moduleResolution: ts_module.ModuleResolutionKind.NodeJs,
      },
      fileName: filename,
      reportDiagnostics: false,
    });
    (
      module as NodeModule & {
        _compile: (code: string, file_name: string) => void;
      }
    )._compile(transpiled.outputText, filename);
  };

  extensions[".ts"] = hook;
  extensions[".tsx"] = hook;
  extensions[".cts"] = hook;
  extensions[".mts"] = hook;

  ts_loader_ready = true;
}

export function load_module_exports(
  module_path: string,
  context: LoaderContext,
): Record<string, unknown> {
  const absolute_path = path.resolve(module_path);
  if (!fs.existsSync(absolute_path)) {
    throw get_error(context, `Module not found: ${absolute_path}`);
  }

  ensure_ts_loader(context);

  let resolved: string;
  try {
    resolved = runtime_require.resolve(absolute_path);
  } catch (error) {
    throw get_error(
      context,
      `Unable to resolve module '${absolute_path}': ${String(error)}`,
    );
  }

  delete runtime_require.cache[resolved];

  try {
    const loaded = runtime_require(resolved) as Record<string, unknown>;
    return loaded;
  } catch (error) {
    throw get_error(
      context,
      `Failed to load TypeScript module '${absolute_path}'. If this project uses ESM-only tooling, run with tsx/ts-node loader. Original error: ${String(error)}`,
    );
  }
}
