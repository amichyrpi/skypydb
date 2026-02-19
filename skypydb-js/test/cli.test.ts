import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import package_json from "../package.json";
import { run_cli } from "../src/cli/cli";

type CapturedStreams = {
  out: string;
  err: string;
};

function capture_process_streams(): {
  restore: () => CapturedStreams;
} {
  let out = "";
  let err = "";
  const original_out = process.stdout.write.bind(process.stdout);
  const original_err = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: unknown) => {
    out += String(chunk);
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: unknown) => {
    err += String(chunk);
    return true;
  }) as typeof process.stderr.write;

  return {
    restore: () => {
      process.stdout.write = original_out;
      process.stderr.write = original_err;
      return { out, err };
    },
  };
}

function make_temp_dir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skypydb-js-cli-"));
}

afterEach(() => {
  // no-op placeholder for consistent cleanup style in this test file
});

describe("cli", () => {
  it("shows help with dev and deploy commands", async () => {
    const capture = capture_process_streams();
    const code = await run_cli(["node", "skypydb", "--help"]);
    const streams = capture.restore();

    expect(code).toBe(0);
    expect(streams.out).toContain("dev");
    expect(streams.out).toContain("deploy");
  });

  it("shows version", async () => {
    const capture = capture_process_streams();
    const code = await run_cli(["node", "skypydb", "--version"]);
    const streams = capture.restore();

    expect(code).toBe(0);
    expect(streams.out).toContain(String(package_json.version));
  });

  it("returns non-zero for unknown command", async () => {
    const capture = capture_process_streams();
    const code = await run_cli(["node", "skypydb", "unknown-command"]);
    const streams = capture.restore();

    expect(code).toBeGreaterThan(0);
    expect(streams.err.length + streams.out.length).toBeGreaterThan(0);
  });

  it("deploy prints placeholder text", async () => {
    const logs: string[] = [];
    const errors: string[] = [];
    const code = await run_cli(["node", "skypydb", "deploy"], {
      log: (message: string) => logs.push(message),
      error: (message: string) => errors.push(message),
    });

    expect(code).toBe(0);
    expect(errors).toEqual([]);
    expect(logs).toEqual(["Not ready yet"]);
  });

  it("dev cloud option prints placeholder text", async () => {
    const logs: string[] = [];
    const code = await run_cli(["node", "skypydb", "dev"], {
      prompt: async () => ({ action: "cloud" }),
      log: (message: string) => logs.push(message),
    });

    expect(code).toBe(0);
    expect(logs).toEqual(["Not ready yet"]);
  });

  it("dev exit option exits cleanly without writes", async () => {
    const base_dir = make_temp_dir();
    const code = await run_cli(["node", "skypydb", "dev"], {
      prompt: async () => ({ action: "exit" }),
      cwd: () => base_dir,
    });

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(base_dir, "skypydb"))).toBe(false);
    fs.rmSync(base_dir, { recursive: true, force: true });
  });

  it("dev local option scaffolds skypydb folder with tsconfig and readme", async () => {
    const base_dir = make_temp_dir();
    const logs: string[] = [];
    const code = await run_cli(["node", "skypydb", "dev"], {
      prompt: async () => ({ action: "local" }),
      cwd: () => base_dir,
      log: (message: string) => logs.push(message),
    });

    const project_dir = path.join(base_dir, "skypydb");
    const tsconfig_path = path.join(project_dir, "tsconfig.json");
    const readme_path = path.join(project_dir, "README.md");

    expect(code).toBe(0);
    expect(logs).toContain("Created local project at ./skypydb");
    expect(fs.existsSync(project_dir)).toBe(true);
    expect(fs.existsSync(tsconfig_path)).toBe(true);
    expect(fs.existsSync(readme_path)).toBe(true);

    const tsconfig = JSON.parse(fs.readFileSync(tsconfig_path, "utf8")) as {
      compilerOptions: Record<string, unknown>;
      include: string[];
    };
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(tsconfig.compilerOptions.noEmit).toBe(true);
    expect(tsconfig.include).toEqual(["./**/*.ts"]);

    const readme = fs.readFileSync(readme_path, "utf8");
    expect(readme).toContain("Skypydb Local Project");
    expect(readme).toContain("schemas.ts");

    fs.rmSync(base_dir, { recursive: true, force: true });
  });

  it("dev local option fails when skypydb folder already exists", async () => {
    const base_dir = make_temp_dir();
    const existing_dir = path.join(base_dir, "skypydb");
    fs.mkdirSync(existing_dir, { recursive: true });
    fs.writeFileSync(path.join(existing_dir, "existing.txt"), "keep", "utf8");

    const logs: string[] = [];
    const errors: string[] = [];

    const code = await run_cli(["node", "skypydb", "dev"], {
      prompt: async () => ({ action: "local" }),
      cwd: () => base_dir,
      log: (message: string) => logs.push(message),
      error: (message: string) => errors.push(message),
    });

    expect(code).toBe(1);
    expect(logs).toEqual([]);
    expect(errors).toContain(
      "A 'skypydb' folder already exists in this directory.",
    );
    expect(
      fs.readFileSync(path.join(existing_dir, "existing.txt"), "utf8"),
    ).toBe("keep");

    fs.rmSync(base_dir, { recursive: true, force: true });
  });
});
