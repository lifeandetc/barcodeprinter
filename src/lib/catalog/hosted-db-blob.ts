import "server-only";

import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const STORE_NAME = "life-etc-studio";
const BLOB_KEY = "sqlite";
const MIN_BYTES = 64_000;

const globalState = globalThis as typeof globalThis & { lifeEtcBlobHydrated?: boolean };

export function isHostedRuntime() {
  return Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function hostedDbPath() {
  const database = process.env.DATABASE_URL?.includes("/tmp/")
    ? process.env.DATABASE_URL
    : "file:/tmp/life-etc.db";
  return database.startsWith("file:") ? database.replace(/^file:/, "") : "";
}

function templatePath() {
  const candidates = [
    path.join(process.cwd(), "prisma", "hosted-template.db"),
    path.join(process.cwd(), "..", "prisma", "hosted-template.db"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export async function hydrateHostedDatabaseFromBlob() {
  if (!isHostedRuntime()) return;
  if (globalState.lifeEtcBlobHydrated) return;
  const dbPath = hostedDbPath();
  if (!dbPath) return;

  let restored = false;
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const blob = await store.get(BLOB_KEY, { type: "blob" });
    if (blob) {
      const bytes = Buffer.from(await blob.arrayBuffer());
      if (bytes.byteLength >= MIN_BYTES) {
        writeFileSync(dbPath, bytes);
        restored = true;
      }
    }
  } catch (error) {
    console.error("Could not load hosted database from Netlify Blobs.", error);
  }

  if (!restored && (!existsSync(dbPath) || statSync(dbPath).size < MIN_BYTES)) {
    const template = templatePath();
    if (!template) throw new Error("Hosted database template is missing. Redeploy from the latest build.");
    copyFileSync(template, dbPath);
  }
  globalState.lifeEtcBlobHydrated = true;
}

export async function persistHostedDatabaseToBlob() {
  if (!isHostedRuntime()) return;
  const dbPath = hostedDbPath();
  if (!dbPath || !existsSync(dbPath)) return;
  if (statSync(dbPath).size < MIN_BYTES) return;
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: STORE_NAME, consistency: "strong" });
    const bytes = readFileSync(dbPath);
    await store.set(BLOB_KEY, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  } catch (error) {
    console.error("Could not save hosted database to Netlify Blobs.", error);
  }
}
