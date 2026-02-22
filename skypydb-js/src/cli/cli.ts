import fs from "node:fs";
import path from "node:path";
import prompts from "prompts";
import { Command, CommanderError } from "commander";
import package_json from "../../package.json";

type DevAction = "local" | "cloud" | "exit";

type PromptFunction = (
  questions: prompts.PromptObject | prompts.PromptObject[],
  options?: prompts.Options,
) => Promise<Record<string, unknown>>;

type CliDependencies = {
  prompt: PromptFunction;
  cwd: () => string;
  log: (message: string) => void;
  error: (message: string) => void;
  exists_sync: (target: string) => boolean;
  mkdir_sync: (target: string) => void;
  write_atomic: (target: string, content: string) => void;
  readme_template: () => string;
};

const NOT_READY_TEXT = "Not ready yet";

function load_readme_template(): string {
  const candidates: string[] = [];

  if (typeof __dirname === "string") {
    candidates.push(path.join(__dirname, "codegen_templates", "README.md"));
    candidates.push(
      path.join(
        __dirname,
        "..",
        "src",
        "cli",
        "codegen_templates",
        "README.md",
      ),
    );
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
  }

  throw new Error("CLI README template file is missing.");
}

const default_dependencies: CliDependencies = {
  prompt: prompts as PromptFunction,
  cwd: () => process.cwd(),
  log: (message: string) => {
    process.stdout.write(`${message}\n`);
  },
  error: (message: string) => {
    process.stderr.write(`${message}\n`);
  },
  exists_sync: (target: string) => fs.existsSync(target),
  mkdir_sync: (target: string) => {
    fs.mkdirSync(target, { recursive: false });
  },
  write_atomic: (target: string, content: string) => {
    const tmp_path = `${target}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp_path, content, "utf8");
    fs.renameSync(tmp_path, target);
  },
  readme_template: () => load_readme_template(),
};

function tsconfig_template(): string {
  const config = {
    compilerOptions: {
      target: "ES2022",
      module: "ESNext",
      moduleResolution: "Bundler",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: ["node"],
    },
    include: ["./**/*.ts"],
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

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
  const project_dir = path.join(dependencies.cwd(), "skypydb");
  if (dependencies.exists_sync(project_dir)) {
    dependencies.error("A 'skypydb' folder already exists in this directory.");
    return 1;
  }

  dependencies.mkdir_sync(project_dir);
  dependencies.write_atomic(
    path.join(project_dir, "tsconfig.json"),
    tsconfig_template(),
  );
  dependencies.write_atomic(
    path.join(project_dir, "README.md"),
    dependencies.readme_template(),
  );
  dependencies.log("Created local project at ./skypydb");
  return 0;
}

async function run_dev_command(dependencies: CliDependencies): Promise<number> {
  const action = await ask_dev_action(dependencies.prompt);
  if (action === null || action === "exit") {
    return 0;
  }
  if (action === "cloud") {
    dependencies.log(NOT_READY_TEXT);
    return 0;
  }
  return create_local_project(dependencies);
}

function create_program(dependencies: CliDependencies): Command {
  const program = new Command();
  program.name("skypydb");
  program.description("Skypydb JavaScript CLI");
  program.version(String(package_json.version));

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

  program
    .command("deploy")
    .description("Deploy your project")
    .action((): void => {
      dependencies.log(NOT_READY_TEXT);
    });

  program.exitOverride();
  return program;
}

export async function run_cli(
  argv: string[] = process.argv,
  partial_dependencies: Partial<CliDependencies> = {},
): Promise<number> {
  const dependencies: CliDependencies = {
    ...default_dependencies,
    ...partial_dependencies,
  };

  const program = create_program(dependencies);

  try {
    await program.parseAsync(argv, { from: "node" });
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      if (
        error.code === "commander.helpDisplayed" ||
        error.code === "commander.version"
      ) {
        return 0;
      }
      if (error.code === "skypydb.dev_failed") {
        return error.exitCode;
      }
      return error.exitCode || 1;
    }
    dependencies.error(String(error));
    return 1;
  }
}
