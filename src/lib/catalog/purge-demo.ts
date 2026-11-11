import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof prisma;

export async function purgeDemoCatalog(client: Client = prisma) {
  await client.inventoryCount.deleteMany({
    where: {
      OR: [{ variation: { source: "demo" } }, { location: { source: "demo" } }],
    },
  });
  await client.stockAdjustment.deleteMany({ where: { variation: { source: "demo" } } });
  await client.priceChange.deleteMany({ where: { variation: { source: "demo" } } });
  await client.priceDraft.deleteMany({ where: { variation: { source: "demo" } } });
  await client.barcodeTest.deleteMany({ where: { variation: { source: "demo" } } });
  await client.labelProfile.deleteMany({ where: { variation: { source: "demo" } } });
  await client.catalogItem.deleteMany({ where: { source: "demo" } });
  await client.category.deleteMany({ where: { source: "demo" } });
  await client.squareLocation.deleteMany({ where: { source: "demo" } });
}
