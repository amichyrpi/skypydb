const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(
  projectRoot,
  "src",
  "cli",
  "codegen_templates",
  "README.md",
);
const targetDir = path.join(projectRoot, "dist", "codegen_templates");
const targetPath = path.join(targetDir, "README.md");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing CLI README template at ${sourcePath}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);
