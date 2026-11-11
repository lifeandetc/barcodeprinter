import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const templatePath = path.join(root, "prisma", "hosted-template.db");

if (existsSync(templatePath)) unlinkSync(templatePath);

mkdirSync(path.dirname(templatePath), { recursive: true });

const env = { ...process.env, DATABASE_URL: `file:${templatePath}` };
execFileSync(process.execPath, [path.join(root, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], {
  cwd: root,
  env,
  stdio: "inherit",
});

console.log("Hosted SQLite template is ready.");
