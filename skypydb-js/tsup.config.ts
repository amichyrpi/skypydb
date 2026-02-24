import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    httpclient: "src/httpclient/index.ts",
    functions: "src/functions/index.ts",
    serverside: "src/serverside/index.ts",
    cli: "src/cli/index.ts",
  },
  format: ["esm", "cjs"],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node18",
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
