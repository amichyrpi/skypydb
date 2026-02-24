import path from "node:path";
import { Command, CommanderError } from "commander";

import {
  configure_cloud_auth_placeholder,
  configure_local_auth_env,
} from "./auth";
import type { CliDependencies, PromptFunction } from "./dependencies";
import { collect_deploy_files, run_deploy_command } from "./deploy";

type DevAction = "local" | "cloud" | "exit";

const LOCAL_SOURCE_DIR = "skypydb";
const SOURCE_SCAN_INTERVAL_MS = 1000;

async function ask_dev_action(
  prompt_fn: PromptFunction,
): Promise<DevAction | null> {
  const response = await prompt_fn(
    {
      type: "select",
      name: "action",
      message: "Choose an option",
      choices: [
        { title: "create a new local project", value: "local" },
        { title: "create a new cloud project", value: "cloud" },
        { title: "exit", value: "exit" },
      ],
      initial: 0,
      onRender(this: unknown) {
        const render_context = this as {
          symbols?: {
            pointer?: string;
          };
        };
        if (render_context.symbols) {
          render_context.symbols.pointer = "\u276f";
        }
      },
    },
    {
      onCancel: () => true,
    },
  );

  const selected = response.action;
  if (selected === "local" || selected === "cloud" || selected === "exit") {
    return selected;
  }
  return null;
}

function create_local_project(dependencies: CliDependencies): number {
  try {
    const template_files = dependencies.codegen_template_files();
    if (template_files.length === 0) {
      dependencies.error("No template files were found in codegen_templates.");
      return 1;
    }

    const cwd = dependencies.cwd();
    for (const template_file of template_files) {
      const destination = path.join(cwd, template_file.relative_path);
      if (dependencies.exists_sync(destination)) {
        dependencies.error(
          `Cannot create local project because '${template_file.relative_path}' already exists.`,
        );
        return 1;
      }
    }

    if (!validate_destination_directories(template_files, cwd, dependencies)) {
      return 1;
    }

    for (const template_file of template_files) {
      const destination = path.join(cwd, template_file.relative_path);
      const destination_dir = path.dirname(destination);
      ensure_directory_exists(destination_dir, dependencies);
      dependencies.write_atomic(destination, template_file.content);
    }

    dependencies.log(
      "Created local project from codegen_templates in current directory.",
    );
    return 0;
  } catch (error) {
    dependencies.error(`Failed to create local project: ${String(error)}`);
    return 1;
  }
}

function validate_destination_directories(
  template_files: ReturnType<CliDependencies["codegen_template_files"]>,
  cwd: string,
  dependencies: CliDependencies,
): boolean {
  for (const template_file of template_files) {
    const destination = path.join(cwd, template_file.relative_path);
    const destination_dir = path.dirname(destination);
    const relative_dir = path.relative(cwd, destination_dir);

    if (
      relative_dir.startsWith("..") ||
      path.isAbsolute(relative_dir)
    ) {
      dependencies.error(
        `Cannot create '${template_file.relative_path}' because its destination resolves outside the current directory.`,
      );
      return false;
    }
    if (relative_dir === "") {
      continue;
    }

    let current = cwd;
    for (const segment of relative_dir.split(path.sep)) {
      if (!segment || segment === ".") {
        continue;
      }
      current = path.join(current, segment);
      if (!dependencies.exists_sync(current)) {
        continue;
      }
      if (!dependencies.is_directory(current)) {
        dependencies.error(
          `Cannot create '${template_file.relative_path}' because path component '${path.relative(cwd, current)}' exists and is not a directory.`,
        );
        return false;
      }
    }
  }

  return true;
}

function ensure_directory_exists(
  target_dir: string,
  dependencies: CliDependencies,
): void {
  if (dependencies.exists_sync(target_dir)) {
    if (!dependencies.is_directory(target_dir)) {
      throw new Error(`Path '${target_dir}' exists and is not a directory.`);
    }
    return;
  }

  const parent_dir = path.dirname(target_dir);
  if (parent_dir !== target_dir) {
    ensure_directory_exists(parent_dir, dependencies);
  }
  dependencies.mkdir_sync(target_dir);
}

type SourceSnapshot = {
  signature: string;
  deployable_function_count: number;
};

function read_source_snapshot(
  source_dir: string,
  dependencies: CliDependencies,
): SourceSnapshot {
  const { source_files, modules } = collect_deploy_files(
    source_dir,
    dependencies,
  );
  return {
    signature: JSON.stringify(
      source_files.map((source_file) => [
        source_file.path,
        source_file.content,
      ]),
    ),
    deployable_function_count: modules.length,
  };
}

async function deploy_local_if_functions_exist(
  snapshot: SourceSnapshot,
  dependencies: CliDependencies,
): Promise<number> {
  if (snapshot.deployable_function_count === 0) {
    dependencies.log(
      "No readFunction/writeFunction exports found yet in ./skypydb. Waiting for new functions...",
    );
    return 0;
  }
  return run_deploy_command(
    {
      local: true,
      source: LOCAL_SOURCE_DIR,
    },
    dependencies,
  );
}

async function watch_and_auto_deploy_local(
  dependencies: CliDependencies,
): Promise<number> {
  const source_dir = path.resolve(dependencies.cwd(), LOCAL_SOURCE_DIR);
  let previous_snapshot = read_source_snapshot(source_dir, dependencies);
  let last_scan_error: string | null = null;
  let deployment_in_progress = false;
  let pending_scan = false;
  let stop_requested = false;
  let finalize_stop: (() => void) | null = null;

  const run_scan = async (): Promise<void> => {
    if (stop_requested) {
      return;
    }
    if (deployment_in_progress) {
      pending_scan = true;
      return;
    }

    deployment_in_progress = true;
    try {
      const next_snapshot = read_source_snapshot(source_dir, dependencies);
      last_scan_error = null;

      if (next_snapshot.signature === previous_snapshot.signature) {
        return;
      }

      previous_snapshot = next_snapshot;
      dependencies.log("Detected function source changes. Auto-deploying...");
      const deploy_exit_code = await deploy_local_if_functions_exist(
        next_snapshot,
        dependencies,
      );
      if (deploy_exit_code !== 0) {
        dependencies.error(
          "Auto-deploy failed. Continuing to watch for future changes.",
        );
      }
    } catch (error) {
      const message = `Source scan failed: ${String(error)}`;
      if (last_scan_error !== message) {
        dependencies.error(message);
      }
      last_scan_error = message;
    } finally {
      deployment_in_progress = false;
      if (pending_scan && !stop_requested) {
        pending_scan = false;
        void run_scan();
      }
      if (stop_requested) {
        finalize_stop?.();
      }
    }
  };

  dependencies.log(
    "Watching ./skypydb for new or changed functions. Press Ctrl+C to stop.",
  );

  return new Promise<number>((resolve) => {
    let resolved = false;
    const timer = setInterval(() => {
      void run_scan();
    }, SOURCE_SCAN_INTERVAL_MS);

    const resolve_once = () => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve(0);
    };
    finalize_stop = resolve_once;

    const stop = () => {
      if (stop_requested) {
        return;
      }
      stop_requested = true;
      clearInterval(timer);
      process.off("SIGINT", handle_stop_signal);
      process.off("SIGTERM", handle_stop_signal);
      dependencies.log("Stopped local function watcher.");
      if (!deployment_in_progress) {
        resolve_once();
      }
    };

    const handle_stop_signal = () => {
      stop();
    };

    process.on("SIGINT", handle_stop_signal);
    process.on("SIGTERM", handle_stop_signal);
  });
}

async function run_dev_command(dependencies: CliDependencies): Promise<number> {
  const action = await ask_dev_action(dependencies.prompt);
  if (action === null || action === "exit") {
    return 0;
  }
  if (action === "cloud") {
    return configure_cloud_auth_placeholder(dependencies);
  }

  const create_exit_code = create_local_project(dependencies);
  if (create_exit_code !== 0) {
    return create_exit_code;
  }
  const auth_exit_code = configure_local_auth_env(dependencies);
  if (auth_exit_code !== 0) {
    return auth_exit_code;
  }

  const initial_snapshot = read_source_snapshot(
    path.resolve(dependencies.cwd(), LOCAL_SOURCE_DIR),
    dependencies,
  );
  const initial_deploy_exit_code = await deploy_local_if_functions_exist(
    initial_snapshot,
    dependencies,
  );
  if (initial_deploy_exit_code !== 0) {
    return initial_deploy_exit_code;
  }

  return watch_and_auto_deploy_local(dependencies);
}

export function register_dev_command(
  program: Command,
  dependencies: CliDependencies,
): void {
  program
    .command("dev")
    .description("Interactive local/cloud project setup")
    .action(async (): Promise<void> => {
      const exit_code = await run_dev_command(dependencies);
      if (exit_code !== 0) {
        throw new CommanderError(
          exit_code,
          "skypydb.dev_failed",
          "dev command failed",
        );
      }
    });
}
