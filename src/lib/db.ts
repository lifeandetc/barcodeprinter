import { PrismaClient } from "@prisma/client";
import { ensureDatabaseReady } from "@/lib/catalog/ensure-database";
import { hydrateHostedDatabaseFromBlob } from "@/lib/catalog/hosted-db-blob";

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return;
  const hosted = Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (hosted) process.env.DATABASE_URL = "file:/tmp/life-etc.db";
}

ensureDatabaseUrl();

await hydrateHostedDatabaseFromBlob();
ensureDatabaseReady();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
