const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(
  projectRoot,
  "src",
  "cli",
  "templates",
  "local_project_readme.md",
);
const targetDir = path.join(projectRoot, "dist", "templates");
const targetPath = path.join(targetDir, "local_project_readme.md");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing CLI README template at ${sourcePath}`);
}

fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(sourcePath, targetPath);
