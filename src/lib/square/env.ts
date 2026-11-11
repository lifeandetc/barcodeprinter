import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function saveSquareCredentials(input: { token: string; environment: "production" | "sandbox" }) {
  const token = input.token.trim();
  if (token.length < 20 || /[\r\n"]/.test(token)) {
    throw new Error("Paste the Square personal access token. It stays on this Mac and is not shown again.");
  }
  const environment = input.environment === "sandbox" ? "sandbox" : "production";
  const file = path.join(process.cwd(), ".env");
  const current = await readFile(file, "utf8");
  const next = upsertEnv(upsertEnv(current, "SQUARE_ACCESS_TOKEN", token), "SQUARE_ENVIRONMENT", environment);
  await writeFile(file, next.endsWith("\n") ? next : `${next}\n`, { mode: 0o600 });
  process.env.SQUARE_ACCESS_TOKEN = token;
  process.env.SQUARE_ENVIRONMENT = environment;
  return { environment };
}

function upsertEnv(source: string, key: string, value: string) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(source)) return source.replace(pattern, line);
  return `${source.trimEnd()}\n${line}\n`;
}
