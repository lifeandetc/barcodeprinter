import { randomBytes } from "node:crypto";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "data");
const dbPath = path.join(dataDir, "life-etc.db");
const envPath = path.join(root, ".env");

mkdirSync(dataDir, { recursive: true });

if (!existsSync(envPath)) {
  const secret = randomBytes(32).toString("hex");
  writeFileSync(
    envPath,
    [
      `DATABASE_URL="file:${dbPath}"`,
      "SQUARE_ACCESS_TOKEN=",
      "SQUARE_ENVIRONMENT=production",
      "SQUARE_WEBHOOK_SIGNATURE_KEY=",
      "SQUARE_WEBHOOK_NOTIFICATION_URL=",
      "APP_ACCESS_PASSWORD=",
      `SESSION_SECRET="${secret}"`,
      "CRON_SECRET=",
      "",
    ].join("\n"),
  );
  console.log("Created .env. Add SQUARE_ACCESS_TOKEN when you are ready to import.");
} else if (!readFileSync(envPath, "utf8").includes("DATABASE_URL=")) {
  writeFileSync(envPath, `\nDATABASE_URL="file:${dbPath}"\n`, { flag: "a" });
}

execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: root });
console.log("Database is ready.");
