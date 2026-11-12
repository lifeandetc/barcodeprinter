import { copyFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";

const globalState = globalThis as typeof globalThis & { lifeEtcDbReady?: boolean };

const MIN_HOSTED_DB_BYTES = 64_000;

function hostedTemplatePath(): string | null {
  const candidates = [
    path.join(process.cwd(), "prisma", "hosted-template.db"),
    path.join(process.cwd(), "..", "prisma", "hosted-template.db"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function copyHostedTemplate(dbPath: string, template: string) {
  copyFileSync(template, dbPath);
}

function needsHostedTemplate(dbPath: string, template: string) {
  if (!existsSync(dbPath)) return true;
  const dbSize = statSync(dbPath).size;
  const templateSize = statSync(template).size;
  return dbSize < MIN_HOSTED_DB_BYTES || dbSize < templateSize * 0.25;
}

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
  const template = hostedTemplatePath();
  if (!template) {
    throw new Error("Hosted database template is missing. Redeploy from the latest build.");
  }
  if (needsHostedTemplate(dbPath, template)) {
    copyHostedTemplate(dbPath, template);
  }
  globalState.lifeEtcDbReady = true;
}
