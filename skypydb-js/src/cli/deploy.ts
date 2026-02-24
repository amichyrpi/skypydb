import path from "node:path";
import { Command, CommanderError } from "commander";

import type { CliDependencies } from "./dependencies";

export type DeployMode = "local" | "cloud";

export type DeployCommandOptions = {
  local?: boolean;
  cloud?: boolean;
  source?: string;
  apiUrl?: string;
  apiKey?: string;
};

export type DeployModule = {
  module_key: string;
  import_path: string;
  import_alias: string;
};

export type DeploySourceFile = {
  path: string;
  content: string;
};

const FUNCTION_EXPORT_RE =
  /export\s+const\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*(readFunction|writeFunction)\s*\(/;
const IGNORED_SOURCE_DIRS = new Set(["node_modules", ".generated", "dist"]);

function resolve_deploy_mode(
  options: DeployCommandOptions,
): DeployMode | undefined {
  const local_selected = options.local === true;
  const cloud_selected = options.cloud === true;
  if (local_selected && cloud_selected) {
    return undefined;
  }
  if (cloud_selected) {
    return "cloud";
  }
  return "local";
}

function normalize_api_url(api_url: string): string {
  return api_url.trim().replace(/\/+$/, "");
}

function to_posix_path(value: string): string {
  return value.replace(/\\/g, "/");
}

function is_js_identifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
}

function object_key_literal(value: string): string {
  return is_js_identifier(value) ? value : JSON.stringify(value);
}

function sanitize_alias_base(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_$]/g, "_");
  if (cleaned.length === 0) {
    return "module";
  }
  if (!/^[A-Za-z_$]/.test(cleaned)) {
    return `module_${cleaned}`;
  }
  return cleaned;
}

function collect_ts_files(
  source_dir: string,
  dependencies: CliDependencies,
): string[] {
  const discovered: string[] = [];
  const stack = [source_dir];

  while (stack.length > 0) {
    const current_dir = stack.pop();
    if (!current_dir) {
      continue;
    }
    const entries = dependencies.readdir_sync(current_dir);
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const full_path = path.join(current_dir, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_SOURCE_DIRS.has(entry.name)) {
          stack.push(full_path);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!entry.name.endsWith(".ts") || entry.name.endsWith(".d.ts")) {
        continue;
      }
      discovered.push(full_path);
    }
  }

  discovered.sort();
  return discovered;
}

export function collect_deploy_files(
  source_dir: string,
  dependencies: CliDependencies,
): { source_files: DeploySourceFile[]; modules: DeployModule[] } {
  const source_files: DeploySourceFile[] = [];
  const module_candidates: Array<{ module_key: string; import_path: string }> =
    [];

  for (const file_path of collect_ts_files(source_dir, dependencies)) {
    const relative = to_posix_path(path.relative(source_dir, file_path));
    const content = dependencies.read_utf8(file_path);
    source_files.push({ path: relative, content });

    if (relative === "deploy.ts") {
      continue;
    }
    if (!FUNCTION_EXPORT_RE.test(content)) {
      continue;
    }

    let module_path = relative.slice(0, -".ts".length);
    if (module_path.endsWith("/index")) {
      module_path = module_path.slice(0, -"/index".length);
    }
    const module_key = module_path.replace(/\//g, ".");
    module_candidates.push({
      module_key,
      import_path: `./${module_path}`,
    });
  }

  module_candidates.sort((left, right) =>
    left.module_key.localeCompare(right.module_key),
  );
  const alias_counts = new Map<string, number>();
  const modules = module_candidates.map((module) => {
    const tail_segment = module.module_key.split(".").at(-1) ?? "module";
    const alias_base = sanitize_alias_base(tail_segment);
    const count = alias_counts.get(alias_base) ?? 0;
    alias_counts.set(alias_base, count + 1);
    return {
      ...module,
      import_alias: count === 0 ? alias_base : `${alias_base}_${count}`,
    };
  });

  source_files.sort((left, right) => left.path.localeCompare(right.path));
  return { source_files, modules };
}

function deploy_ts_template(modules: DeployModule[]): string {
  const imports = modules
    .map(
      (module) =>
        `import type * as ${module.import_alias} from "${module.import_path}";`,
    )
    .join("\n");
  const api_entries = modules
    .map(
      (module) =>
        `  ${object_key_literal(module.module_key)}: typeof ${module.import_alias};`,
    )
    .join("\n");

  return `/* This file is used to deploy your database functions to the server (cloud or self-hosted)
 * You can deploy your database functions by running the following command in your terminal:
 *
 * \`\`\`bash
 * npx skypydb deploy
 * \`\`\`
 *
 * Do not modify this file manually, otherwise your functions will no longer work.
 * This file is automatically created and updated when you run the deploy command.
 */

import {
  SKYPYDB_FUNCTION_ENDPOINT,
  SKYPYDB_FUNCTION_REFERENCE,
  SKYPYDB_FUNCTION_TO_STRING,
} from "skypydb/serverside";
import type { ApiFromFunction, FunctionExporter } from "skypydb/serverside";
import type { deploys } from "skypydb/functions";

${imports}

declare const Api: ApiFromFunction<{
${api_entries}
}>;

function createApi(path: string[] = []): unknown {
  const toEndpoint = () => path.join(".");
  return new Proxy(
    {
      [SKYPYDB_FUNCTION_TO_STRING]: toEndpoint,
    },
    {
      get(target, property: string | symbol) {
        if (property === SKYPYDB_FUNCTION_REFERENCE) {
          return true;
        }
        if (property === SKYPYDB_FUNCTION_ENDPOINT) {
          return toEndpoint();
        }
        if (property === SKYPYDB_FUNCTION_TO_STRING) {
          return target[SKYPYDB_FUNCTION_TO_STRING];
        }
        if (property === Symbol.toPrimitive) {
          return target[SKYPYDB_FUNCTION_TO_STRING];
        }
        if (typeof property !== "string") {
          return undefined;
        }
        return createApi([...path, property]);
      },
    },
  );
}

/**
 * API object for deployed functions, including both read and write modules.
 */
export const api = createApi() as deploys<
  typeof Api,
  FunctionExporter<any, "public">
>;
`;
}

function resolve_api_url(
  mode: DeployMode,
  options: DeployCommandOptions,
  dependencies: CliDependencies,
): string | undefined {
  if (typeof options.apiUrl === "string" && options.apiUrl.trim().length > 0) {
    return normalize_api_url(options.apiUrl);
  }
  if (mode === "cloud") {
    const cloud_url = dependencies.env_get("SKYPYDB_CLOUD_API_URL");
    if (typeof cloud_url === "string" && cloud_url.trim().length > 0) {
      return normalize_api_url(cloud_url);
    }
    const fallback_url = dependencies.env_get("SKYPYDB_API_URL");
    if (typeof fallback_url === "string" && fallback_url.trim().length > 0) {
      return normalize_api_url(fallback_url);
    }
    return undefined;
  }

  const local_url = dependencies.env_get("SKYPYDB_API_URL");
  if (typeof local_url === "string" && local_url.trim().length > 0) {
    return normalize_api_url(local_url);
  }
  return "http://localhost:8000";
}

function resolve_api_key(
  mode: DeployMode,
  options: DeployCommandOptions,
  dependencies: CliDependencies,
): string | undefined {
  if (typeof options.apiKey === "string" && options.apiKey.trim().length > 0) {
    return options.apiKey.trim();
  }
  const env_api_key = dependencies.env_get("SKYPYDB_API_KEY");
  if (typeof env_api_key === "string" && env_api_key.trim().length > 0) {
    return env_api_key.trim();
  }
  if (mode === "local") {
    return "local-dev-key";
  }
  return undefined;
}

export async function run_deploy_command(
  options: DeployCommandOptions,
  dependencies: CliDependencies,
): Promise<number> {
  const mode = resolve_deploy_mode(options);
  if (!mode) {
    dependencies.error("Choose exactly one deploy target: --local or --cloud");
    return 1;
  }

  const source_input = options.source?.trim() || "skypydb";
  const source_dir = path.resolve(dependencies.cwd(), source_input);
  if (
    !dependencies.exists_sync(source_dir) ||
    !dependencies.is_directory(source_dir)
  ) {
    dependencies.error(
      `Functions source directory '${source_input}' was not found. Use --source <dir>.`,
    );
    return 1;
  }

  const { source_files, modules } = collect_deploy_files(
    source_dir,
    dependencies,
  );
  if (modules.length === 0) {
    dependencies.error(
      `No exported readFunction/writeFunction definitions were found in '${source_input}'.`,
    );
    return 1;
  }

  const deploy_ts_path = path.join(source_dir, "deploy.ts");
  const deploy_template = deploy_ts_template(modules);
  dependencies.write_atomic(deploy_ts_path, deploy_template);
  const deploy_source_entry = source_files.find((file) => file.path === "deploy.ts");
  if (deploy_source_entry) {
    deploy_source_entry.content = deploy_template;
  } else {
    source_files.push({
      path: "deploy.ts",
      content: deploy_template,
    });
    source_files.sort((left, right) => left.path.localeCompare(right.path));
  }
  dependencies.log(
    `Generated ${to_posix_path(path.relative(dependencies.cwd(), deploy_ts_path))}`,
  );

  const api_url = resolve_api_url(mode, options, dependencies);
  if (!api_url) {
    dependencies.error(
      "Cloud deploy requires --api-url (or SKYPYDB_CLOUD_API_URL / SKYPYDB_API_URL).",
    );
    return 1;
  }
  const api_key = resolve_api_key(mode, options, dependencies);
  if (!api_key) {
    dependencies.error("Deploy requires --api-key (or SKYPYDB_API_KEY).");
    return 1;
  }

  try {
    const response = await dependencies.http_fetch(
      `${api_url}/v1/functions/deploy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": api_key,
        },
        body: JSON.stringify({
          mode,
          files: source_files,
        }),
      },
    );
    const response_text = await response.text();
    if (!response.ok) {
      dependencies.error(
        `Deploy failed with status ${response.status}: ${response_text}`,
      );
      return 1;
    }

    let deployed_functions = modules.length;
    try {
      const parsed = JSON.parse(response_text) as {
        data?: {
          deployed_functions?: unknown;
        };
      };
      if (typeof parsed.data?.deployed_functions === "number") {
        deployed_functions = parsed.data.deployed_functions;
      }
    } catch {
      // Backend response remains valid as long as the request succeeded.
    }

    dependencies.log(
      `Deployed ${deployed_functions} function(s) to ${mode} backend at ${api_url}`,
    );
    return 0;
  } catch (error) {
    dependencies.error(`Deploy failed: ${String(error)}`);
    return 1;
  }
}

export function register_deploy_command(
  program: Command,
  dependencies: CliDependencies,
): void {
  program
    .command("deploy")
    .description(
      "Generate deploy.ts and deploy functions to local or cloud backend",
    )
    .option("--local", "Deploy to local backend (default)")
    .option("--cloud", "Deploy to cloud backend")
    .option("--source <dir>", "Function source directory (default: ./skypydb)")
    .option("--api-url <url>", "Skypydb API base URL")
    .option("--api-key <key>", "Skypydb API key")
    .action(async (options: DeployCommandOptions): Promise<void> => {
      const exit_code = await run_deploy_command(options, dependencies);
      if (exit_code !== 0) {
        throw new CommanderError(
          exit_code,
          "skypydb.deploy_failed",
          "deploy command failed",
        );
      }
    });
}
