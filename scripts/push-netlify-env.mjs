#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const keys = [
  "APP_ACCESS_PASSWORD",
  "SESSION_SECRET",
  "SQUARE_ACCESS_TOKEN",
  "SQUARE_ENVIRONMENT",
  "DATABASE_URL",
  "SQUARE_WEBHOOK_SIGNATURE_KEY",
  "SQUARE_WEBHOOK_NOTIFICATION_URL",
  "CRON_SECRET",
];

if (!existsSync(path.join(root, ".netlify", "state.json"))) {
  console.error("This folder is not linked to a Netlify site yet. Run: netlify link");
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.error("Missing .env. Copy from .env.example and fill in values first.");
  process.exit(1);
}

const values = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .map((line) => line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/))
    .filter(Boolean)
    .map(([, key, raw]) => {
      let value = raw.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return [key, value];
    }),
);

if (!values.DATABASE_URL) {
  values.DATABASE_URL = "file:/tmp/life-etc.db";
}

for (const key of keys) {
  const value = values[key];
  if (!value) continue;
  const secret = ["APP_ACCESS_PASSWORD", "SESSION_SECRET", "SQUARE_ACCESS_TOKEN", "CRON_SECRET"].includes(key);
  const args = ["env:set", key, value, "--context", "production"];
  if (secret) args.push("--secret");
  execFileSync("netlify", args, { stdio: "inherit", cwd: root });
}

console.log("Production environment variables were sent to the linked Netlify site. Redeploy the site.");
