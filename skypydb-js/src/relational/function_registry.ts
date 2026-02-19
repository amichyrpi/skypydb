import fs from "node:fs";
import path from "node:path";
import { FunctionResolutionError } from "../errors";
import { MUTATION_MARKER, QUERY_MARKER } from "./markers";
import { load_module_exports } from "./module_loader";
import type {
  EndpointDefinition,
  EndpointDescriptor,
  MutationDefinition,
  QueryDefinition
} from "./types";

const FUNCTION_FILE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];

function is_typescript_function_file(file_name: string): boolean {
  return FUNCTION_FILE_EXTENSIONS.some((extension) => file_name.endsWith(extension));
}

function should_ignore_file(relative_path: string): boolean {
  const normalized = relative_path.replace(/\\/g, "/");
  if (normalized.endsWith(".d.ts")) {
    return true;
  }
  if (normalized === "schemas.ts") {
    return true;
  }
  return false;
}

function collect_files(base_dir: string, current_dir: string, out: string[]): void {
  const entries = fs.readdirSync(current_dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(current_dir, entry.name);
    if (entry.isDirectory()) {
      collect_files(base_dir, absolute, out);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!is_typescript_function_file(entry.name)) {
      continue;
    }
    const relative = path.relative(base_dir, absolute);
    if (should_ignore_file(relative)) {
      continue;
    }
    out.push(absolute);
  }
}

function endpoint_base_name(functions_dir: string, file_path: string): string {
  const relative = path.relative(functions_dir, file_path).replace(/\\/g, "/");
  const without_extension = relative.replace(/\.[cm]?tsx?$/, "").replace(/\.[cm]?ts$/, "");
  const parts = without_extension.split("/").filter((part) => part.length > 0);
  if (parts.at(-1) === "index") {
    parts.pop();
  }
  return parts.join(".");
}

function is_query_definition(value: unknown): value is QueryDefinition {
  return typeof value === "object" && value !== null && QUERY_MARKER in value;
}

function is_mutation_definition(value: unknown): value is MutationDefinition {
  return typeof value === "object" && value !== null && MUTATION_MARKER in value;
}

function to_endpoint_descriptor(
  endpoint: string,
  definition: EndpointDefinition,
  source_file: string
): EndpointDescriptor {
  if (is_query_definition(definition)) {
    return {
      endpoint,
      kind: "query",
      definition,
      source_file
    };
  }

  return {
    endpoint,
    kind: "mutation",
    definition,
    source_file
  };
}

export function discover_endpoints(project_root = process.cwd()): Map<string, EndpointDescriptor> {
  const functions_dir = path.join(project_root, "skypydb");
  if (!fs.existsSync(functions_dir)) {
    throw new FunctionResolutionError(
      `Functions directory not found at '${functions_dir}'. Create a skypydb/ folder with query/mutation files.`
    );
  }

  const files: string[] = [];
  collect_files(functions_dir, functions_dir, files);

  const endpoints = new Map<string, EndpointDescriptor>();
  for (const file_path of files) {
    const module_base = endpoint_base_name(functions_dir, file_path);
    const exports_object = load_module_exports(file_path, "function");

    for (const [export_name, value] of Object.entries(exports_object)) {
      if (export_name === "default") {
        continue;
      }
      if (!is_query_definition(value) && !is_mutation_definition(value)) {
        continue;
      }
      const endpoint = module_base.length > 0 ? `${module_base}.${export_name}` : export_name;
      if (endpoints.has(endpoint)) {
        const existing = endpoints.get(endpoint);
        throw new FunctionResolutionError(
          `Duplicate endpoint '${endpoint}' found in '${existing?.source_file}' and '${file_path}'.`
        );
      }
      endpoints.set(endpoint, to_endpoint_descriptor(endpoint, value, file_path));
    }
  }

  return endpoints;
}

