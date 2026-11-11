import type { Prisma } from "@prisma/client";
import { purgeDemoCatalog } from "@/lib/catalog/purge-demo";
import { prisma } from "@/lib/db";
import { imageUrlFor, type MappedCount, type MappedLocation, mapCatalogObjects } from "@/lib/square/map";
import { shouldApplyRemote } from "@/lib/square/merge";
import { toPlain } from "@/lib/square/plain";

type CatalogBundle = ReturnType<typeof mapCatalogObjects>;

function dateOrNull(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function persistLocations(locations: MappedLocation[]) {
  for (const location of locations) {
    await prisma.squareLocation.upsert({
      where: { id: location.id },
      create: { ...location, source: "square", isActive: location.status !== "INACTIVE" },
      update: { ...location, source: "square", isActive: location.status !== "INACTIVE", syncedAt: new Date() },
    });
  }
}

export async function persistSquareSnapshot(input: {
  bundle: CatalogBundle;
  locations: MappedLocation[];
  counts: MappedCount[];
  full: boolean;
}) {
  const conflicts: string[] = [];
  const existingItems = await prisma.catalogItem.findMany({
    where: { source: "square" },
    select: { id: true, version: true },
  });
  const existingVariations = await prisma.variation.findMany({
    where: { source: "square" },
    select: { id: true, itemId: true, version: true, priceAmount: true },
  });
  const itemVersions = new Map(existingItems.map((item) => [item.id, item.version]));
  const variationVersions = new Map(existingVariations.map((variation) => [variation.id, variation]));

  await prisma.$transaction(
    async (tx) => {
      await purgeDemoCatalog(tx);

      for (const location of input.locations) {
        await tx.squareLocation.upsert({
          where: { id: location.id },
          create: { ...location, source: "square", isActive: location.status !== "INACTIVE" },
          update: { ...location, source: "square", isActive: location.status !== "INACTIVE", syncedAt: new Date() },
        });
      }
      for (const category of input.bundle.categories) {
        await tx.category.upsert({
          where: { id: category.id },
          create: { id: category.id, name: category.name, version: category.version, source: "square" },
          update: { name: category.name, version: category.version, source: "square", syncedAt: new Date() },
        });
      }

      const categoryIds = new Set(input.bundle.categories.map((category) => category.id));
      const seenItems: string[] = [];
      const seenVariations: string[] = [];

      for (const item of input.bundle.items) {
        const decision = shouldApplyRemote(itemVersions.get(item.id), item.version);
        if (decision === "skip-older" || (decision === "missing" && itemVersions.has(item.id))) {
          conflicts.push(`Kept the newer local copy of ${item.name}.`);
          seenItems.push(item.id);
          for (const variation of existingVariations) {
            if (variation.itemId === item.id) seenVariations.push(variation.id);
          }
          continue;
        }
        if (item.categoryId && !categoryIds.has(item.categoryId)) {
          await tx.category.upsert({
            where: { id: item.categoryId },
            create: { id: item.categoryId, name: "Uncategorized", source: "square" },
            update: {},
          });
          categoryIds.add(item.categoryId);
        }
        const itemData = {
          source: "square",
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          imageUrl: imageUrlFor(item, input.bundle.images),
          isArchived: item.isArchived,
          absentFromSquare: false,
          productType: item.productType,
          version: item.version,
          squareUpdatedAt: dateOrNull(item.squareUpdatedAt),
          rawJson: JSON.stringify(toPlain(item)),
          syncedAt: new Date(),
        };
        await tx.catalogItem.upsert({
          where: { id: item.id },
          create: { id: item.id, ...itemData },
          update: itemData,
        });
        seenItems.push(item.id);

        for (const variation of item.variations) {
          const previous = variationVersions.get(variation.id);
          const variationDecision = shouldApplyRemote(previous?.version, variation.version);
          if (variationDecision === "skip-older" || (variationDecision === "missing" && previous)) {
            conflicts.push(`Kept the newer Square version already stored for ${variation.sku || variation.name || variation.id}.`);
            seenVariations.push(variation.id);
            continue;
          }
          const variationData = {
            source: "square",
            itemId: item.id,
            name: variation.name,
            sku: variation.sku,
            gtin: variation.gtin,
            priceAmount: variation.priceAmount,
            currency: variation.currency,
            pricingType: variation.pricingType,
            trackInventory: variation.trackInventory,
            sellable: variation.sellable,
            isArchived: variation.isArchived || item.isArchived,
            absentFromSquare: false,
            version: variation.version,
            ordinal: variation.ordinal,
            squareUpdatedAt: dateOrNull(variation.squareUpdatedAt),
            rawJson: JSON.stringify(toPlain(variation)),
            syncedAt: new Date(),
          };
          await tx.variation.upsert({
            where: { id: variation.id },
            create: { id: variation.id, ...variationData },
            update: variationData,
          });
          seenVariations.push(variation.id);
          if (
            previous &&
            previous.priceAmount != null &&
            variation.priceAmount != null &&
            previous.priceAmount !== variation.priceAmount
          ) {
            const profile = await tx.labelProfile.findUnique({ where: { variationId: variation.id } });
            if (profile?.showPrice && profile.labelsPrinted > 0 && profile.lastPrintedPrice !== variation.priceAmount) {
              await tx.labelProfile.update({ where: { variationId: variation.id }, data: { needsReprint: true } });
            }
          }
        }
      }

      if (input.full) {
        await tx.catalogItem.updateMany({
          where: { source: "square", id: { notIn: seenItems.length ? seenItems : ["__none__"] } },
          data: { absentFromSquare: true, isArchived: true },
        });
        await tx.variation.updateMany({
          where: {
            source: "square",
            id: { notIn: seenVariations.length ? seenVariations : ["__none__"] },
          },
          data: { absentFromSquare: true, isArchived: true },
        });
      }

      const knownVariations = new Set(
        (
          await tx.variation.findMany({
            where: { id: { in: input.counts.map((count) => count.variationId) } },
            select: { id: true },
          })
        ).map((variation) => variation.id),
      );
      const refreshed = [...new Set(input.counts.map((count) => count.variationId).filter((id) => knownVariations.has(id)))];
      if (refreshed.length) {
        await tx.inventoryCount.deleteMany({ where: { variationId: { in: refreshed } } });
      }
      const locationIds = new Set(input.locations.map((location) => location.id));
      const rows: Prisma.InventoryCountCreateManyInput[] = [];
      for (const count of input.counts) {
        if (!knownVariations.has(count.variationId)) continue;
        if (!locationIds.has(count.locationId)) {
          await tx.squareLocation.upsert({
            where: { id: count.locationId },
            create: { id: count.locationId, name: "Square location", source: "square" },
            update: {},
          });
          locationIds.add(count.locationId);
        }
        rows.push({
          variationId: count.variationId,
          locationId: count.locationId,
          state: count.state,
          quantity: count.quantity,
          calculatedAt: dateOrNull(count.calculatedAt),
        });
      }
      if (rows.length) await tx.inventoryCount.createMany({ data: rows });
    },
    { timeout: 120_000 },
  );

  return {
    items: input.bundle.items.length,
    variations: input.bundle.items.reduce((total, item) => total + item.variations.length, 0),
    conflicts,
  };
}
