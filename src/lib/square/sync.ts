import { prisma } from "@/lib/db";
import { deleteSetting, getSetting, setSetting } from "@/lib/settings";
import { chunk } from "@/lib/utils";
import { squareErrorMessage } from "@/lib/square/errors";
import { mapCatalogObjects, mapCount, mapLocation } from "@/lib/square/map";
import { findDuplicateSkus } from "@/lib/square/merge";
import { persistLocations, persistSquareSnapshot } from "@/lib/square/persist";
import { listCatalogObjects, listInventoryCounts, listSquareLocations, retrieveCatalogItems } from "@/lib/square/remote";
import { squareClient } from "@/lib/square/client";

type Lock = { runId: string; startedAt: string };

export async function syncSquare(trigger: string) {
  if (!squareClient()) {
    throw new Error("Square is not configured. Add SQUARE_ACCESS_TOKEN on the server. Demo products were left unchanged.");
  }
  if (trigger === "periodic") {
    const recent = await prisma.syncRun.findFirst({
      where: { status: "success", trigger: { in: ["manual", "periodic", "webhook", "initial"] } },
      orderBy: { finishedAt: "desc" },
    });
    if (recent?.finishedAt && Date.now() - recent.finishedAt.getTime() < 10 * 60 * 1000) {
      return { skipped: true as const, message: "Square was synced less than 10 minutes ago." };
    }
  }

  const lock = await getSetting<Lock | null>("syncLock", null);
  if (lock && Date.now() - new Date(lock.startedAt).getTime() < 10 * 60 * 1000) {
    if (trigger === "periodic" || trigger === "webhook") {
      return { skipped: true as const, message: "A Square sync is already running." };
    }
    throw new Error("A Square sync is already running.");
  }

  const run = await prisma.syncRun.create({ data: { trigger, status: "running" } });
  await setSetting("syncLock", { runId: run.id, startedAt: new Date().toISOString() } satisfies Lock);
  const details: string[] = [];

  try {
    const objects = await listCatalogObjects();
    const bundle = mapCatalogObjects(objects);
    const locations = (await listSquareLocations()).map(mapLocation).filter((location) => location != null);
    const variationIds = bundle.items.flatMap((item) => item.variations.map((variation) => variation.id));
    const counts = [];
    for (const group of chunk(variationIds, 100)) {
      const listed = await listInventoryCounts(group);
      counts.push(...listed.map(mapCount).filter((count) => count != null));
    }
    for (const duplicate of findDuplicateSkus(bundle.items.flatMap((item) => item.variations))) {
      details.push(`Duplicate SKU ${duplicate.sku} is on ${duplicate.ids.length} variations. Existing barcodes were not regenerated.`);
    }
    const saved = await persistSquareSnapshot({ bundle, locations, counts, full: true });
    details.push(...saved.conflicts);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        itemsSeen: saved.items,
        variationsSeen: saved.variations,
        conflicts: saved.conflicts.length,
        details: JSON.stringify(details),
      },
    });
    return {
      skipped: false as const,
      message: `Imported ${saved.items} products and ${saved.variations} variations from Square.`,
      ...saved,
      details,
    };
  } catch (error) {
    const message = squareErrorMessage(error);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { status: "failed", finishedAt: new Date(), error: message, details: JSON.stringify(details) },
    });
    throw new Error(message);
  } finally {
    const current = await getSetting<Lock | null>("syncLock", null);
    if (current?.runId === run.id) await deleteSetting("syncLock");
  }
}

export async function probeSquare() {
  const locations = (await listSquareLocations()).map(mapLocation).filter((location) => location != null);
  await persistLocations(locations);
  return locations;
}

export async function refreshItems(ids: string[]) {
  if (!ids.length) return;
  const objects = await retrieveCatalogItems(ids);
  const bundle = mapCatalogObjects(objects);
  const variationIds = bundle.items.flatMap((item) => item.variations.map((variation) => variation.id));
  const counts = (await listInventoryCounts(variationIds)).map(mapCount).filter((count) => count != null);
  const locations = (await listSquareLocations()).map(mapLocation).filter((location) => location != null);
  await persistSquareSnapshot({ bundle, locations, counts, full: false });
}
