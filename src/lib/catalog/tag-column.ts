import { prisma } from "@/lib/db";

export async function ensureLabelTagColumn() {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info(LabelProfile)");
  if (columns.some((column) => column.name === "taggedAt")) return;
  await prisma.$executeRawUnsafe('ALTER TABLE "LabelProfile" ADD COLUMN "taggedAt" DATETIME');
}
