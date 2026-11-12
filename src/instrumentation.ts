export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (!process.env.NETLIFY && !process.env.AWS_LAMBDA_FUNCTION_NAME) return;
  if (!process.env.DATABASE_URL?.trim()) {
    process.env.DATABASE_URL = "file:/tmp/life-etc.db";
  }
  const { hydrateHostedDatabaseFromBlob } = await import("@/lib/catalog/hosted-db-blob");
  await hydrateHostedDatabaseFromBlob();
}
