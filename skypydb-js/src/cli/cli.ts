import { Command, CommanderError } from "commander";
import package_json from "../../package.json";

import { default_dependencies, type CliDependencies } from "./dependencies";
import { register_dev_command } from "./dev";

function create_program(dependencies: CliDependencies): Command {
  const program = new Command();
  program.name("skypydb");
  program.description("Skypydb JavaScript CLI");
  program.version(String(package_json.version));
  program.helpCommand(false);

  register_dev_command(program, dependencies);

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
