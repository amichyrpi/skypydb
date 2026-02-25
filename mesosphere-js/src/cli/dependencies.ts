import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prompts from "prompts";

export type PromptFunction = (
  questions: prompts.PromptObject | prompts.PromptObject[],
  options?: prompts.Options,
) => Promise<Record<string, unknown>>;

export type CliDependencies = {
  prompt: PromptFunction;
  cwd: () => string;
  log: (message: string) => void;
  error: (message: string) => void;
  env_get: (name: string) => string | undefined;
  exists_sync: (target: string) => boolean;
  is_directory: (target: string) => boolean;
  // Uses mkdirSync with recursive=false and throws EEXIST if target already exists.
  // Callers should pre-check with exists_sync + is_directory, or use recursive behavior elsewhere when idempotency is required.
  mkdir_sync: (target: string) => void;
  readdir_sync: (target: string) => fs.Dirent[];
  read_utf8: (target: string) => string;
  write_atomic: (target: string, content: string) => void;
  http_fetch: (input: string, init?: RequestInit) => Promise<Response>;
  codegen_template_files: () => Array<{
    relative_path: string;
    content: string;
  }>;
};

function resolve_codegen_templates_dir(): string {
  const candidates: string[] = [];
  const base_dirs = new Set<string>();

  if (typeof __dirname === "string") {
    base_dirs.add(__dirname);
  }

  try {
    if (typeof import.meta.url === "string" && import.meta.url.length > 0) {
      base_dirs.add(path.dirname(fileURLToPath(import.meta.url)));
    }
  } catch {
    // import.meta.url is unavailable in some CJS runtimes.
  }

  for (const base_dir of base_dirs) {
    candidates.push(path.join(base_dir, "codegen_templates"));
    candidates.push(
      path.join(base_dir, "..", "src", "cli", "codegen_templates"),
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  throw new Error("CLI codegen_templates directory is missing.");
}

function to_posix_path(value: string): string {
  return value.replace(/\\/g, "/");
}

function load_codegen_template_files(): Array<{
  relative_path: string;
  content: string;
}> {
  const template_root = resolve_codegen_templates_dir();
  const files: Array<{ relative_path: string; content: string }> = [];
  const stack = [template_root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const full_path = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full_path);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }

      const relative_path = to_posix_path(
        path.relative(template_root, full_path),
      );
      files.push({
        relative_path,
        content: fs.readFileSync(full_path, "utf8"),
      });
    }
  }

  files.sort((left, right) =>
    left.relative_path.localeCompare(right.relative_path),
  );
  return files;
}

export const default_dependencies: CliDependencies = {
  prompt: prompts as PromptFunction,
  cwd: () => process.cwd(),
  log: (message: string) => {
    process.stdout.write(`${message}\n`);
  },
  error: (message: string) => {
    process.stderr.write(`${message}\n`);
  },
  env_get: (name: string) => process.env[name],
  exists_sync: (target: string) => fs.existsSync(target),
  is_directory: (target: string) => {
    try {
      return fs.statSync(target).isDirectory();
    } catch {
      return false;
    }
  },
  mkdir_sync: (target: string) => {
    fs.mkdirSync(target, { recursive: false });
  },
  readdir_sync: (target: string) =>
    fs.readdirSync(target, { withFileTypes: true }),
  read_utf8: (target: string) => fs.readFileSync(target, "utf8"),
  write_atomic: (target: string, content: string) => {
    const tmp_path = `${target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp_path, content, "utf8");
    try {
      fs.renameSync(tmp_path, target);
    } finally {
      try {
        if (fs.existsSync(tmp_path)) {
          fs.unlinkSync(tmp_path);
        }
      } catch {
        // Preserve original write/rename errors by swallowing cleanup failures.
      }
    }
  },
  http_fetch: (input: string, init?: RequestInit) => fetch(input, init),
  codegen_template_files: () => load_codegen_template_files(),
};
