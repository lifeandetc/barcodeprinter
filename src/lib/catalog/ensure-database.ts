import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const globalState = globalThis as typeof globalThis & { lifeEtcDbReady?: boolean };

export function ensureDatabaseReady() {
  if (globalState.lifeEtcDbReady) return;
  const hosted = Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (!hosted) {
    globalState.lifeEtcDbReady = true;
    return;
  }
  const database = process.env.DATABASE_URL?.includes("/tmp/")
    ? process.env.DATABASE_URL
    : "file:/tmp/life-etc.db";
  if (!database.startsWith("file:")) {
    globalState.lifeEtcDbReady = true;
    return;
  }
  const dbPath = database.replace(/^file:/, "");
  if (!existsSync(dbPath)) {
    const template = path.join(process.cwd(), "prisma", "hosted-template.db");
    if (!existsSync(template)) {
      throw new Error("Hosted database template is missing. Redeploy from the latest build.");
    }
    copyFileSync(template, dbPath);
  }
  globalState.lifeEtcDbReady = true;
}
