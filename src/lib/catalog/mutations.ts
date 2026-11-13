import { prisma } from "@/lib/db";
import { dollarsToCents } from "@/lib/format";
import { jewelryScanCheck } from "@/lib/barcodes/fit";
import { resolveEncodedValue, type BarcodeSource } from "@/lib/barcodes/select";
import { normalizeSku, skuCollision } from "@/lib/barcodes/sku";
import { describeStockChange, type StockReason } from "@/lib/inventory/change";
import { hasSquareToken } from "@/lib/utils";
import { cloneForWrite, sanitizeCatalogItemForWrite } from "@/lib/square/plain";
import { createInventoryChange, retrieveCatalogItems, upsertCatalogObjects } from "@/lib/square/remote";
import { refreshItems } from "@/lib/square/sync";

async function variationOrThrow(id: string) {
  const variation = await prisma.variation.findUnique({
    where: { id },
    include: { item: true, label: true },
  });
  if (!variation || variation.absentFromSquare) throw new Error("That product variation is not in the current catalog.");
  return variation;
}

function requireConfirm(confirm: boolean, message: string) {
  if (!confirm) throw new Error(message);
}

export async function saveLabelProfile(input: {
  variationId: string;
  displayName?: string | null;
  customText?: string | null;
  material?: string | null;
  details?: string | null;
  showPrice?: boolean;
  templateId?: string | null;
  dismissReprint?: boolean;
}) {
  await variationOrThrow(input.variationId);
  await prisma.labelProfile.upsert({
    where: { variationId: input.variationId },
    create: {
      variationId: input.variationId,
      displayName: clean(input.displayName),
      customText: clean(input.customText),
      material: clean(input.material),
      details: clean(input.details),
      showPrice: Boolean(input.showPrice),
      templateId: input.templateId || null,
    },
    update: {
      displayName: clean(input.displayName),
      customText: clean(input.customText),
      material: clean(input.material),
      details: clean(input.details),
      showPrice: Boolean(input.showPrice),
      templateId: input.templateId || null,
      needsReprint: input.dismissReprint ? false : undefined,
    },
  });
  return { message: "Label text saved in Life & Etc. The Square product was not changed." };
}

export async function saveBarcode(input: {
  variationId: string;
  source: BarcodeSource;
  format: string;
  manual?: string | null;
  regenerate?: boolean;
}) {
  const variation = await variationOrThrow(input.variationId);
  const value = resolveEncodedValue({
    existing: variation.label?.barcodeValue,
    regenerate: Boolean(input.regenerate || !variation.label?.barcodeValue),
    source: input.source,
    format: input.format,
    sku: variation.sku,
    gtin: variation.gtin,
    manual: input.manual,
  });
  const scan = jewelryScanCheck(value, input.format);
  if (!scan.ok) {
    throw new Error(scan.reason ?? "That barcode will not scan on a jewelry tag. Create it from the Barcode Generator.");
  }
  const matchesSku = Boolean(variation.sku && value === variation.sku.trim());
  const matchesGtin = Boolean(variation.gtin && value === variation.gtin.trim());
  if (!matchesSku && !matchesGtin) {
    throw new Error("The barcode has to match this variation's Square SKU or GTIN, or a scan will not find the product.");
  }
  const collision = await prisma.labelProfile.findFirst({
    where: { barcodeValue: value, NOT: { variationId: variation.id } },
  });
  if (collision) throw new Error("Another variation already uses that barcode value.");
  await prisma.labelProfile.upsert({
    where: { variationId: variation.id },
    create: {
      variationId: variation.id,
      barcodeValue: value,
      barcodeFormat: input.format,
      barcodeSource: input.source,
    },
    update: {
      barcodeValue: value,
      barcodeFormat: input.format,
      barcodeSource: input.source,
    },
  });
  return { message: "Barcode saved in Life & Etc. Square identifiers were not overwritten.", barcodeValue: value };
}

export async function publishPrices(input: {
  confirm: boolean;
  planName?: string | null;
  changes: { variationId: string; amount: number }[];
}) {
  requireConfirm(input.confirm, "Confirm the price change before it is sent to Square.");
  if (!input.changes.length) throw new Error("Choose at least one price to update.");
  for (const change of input.changes) {
    if (!Number.isInteger(change.amount) || change.amount < 0) throw new Error("Prices must be zero or a positive number of cents.");
  }
  const rows = await prisma.variation.findMany({
    where: { id: { in: input.changes.map((change) => change.variationId) } },
  });
  if (rows.length !== input.changes.length) throw new Error("One of the selected variations is no longer in the catalog.");
  if (!hasSquareToken()) return publishDemoPrices(rows, input);
  if (rows.some((row) => row.source !== "square")) {
    throw new Error("Demo products cannot be published to Square.");
  }
  const byItem = new Map<string, typeof rows>();
  for (const row of rows) {
    byItem.set(row.itemId, [...(byItem.get(row.itemId) ?? []), row]);
  }
  const objects = await retrieveCatalogItems([...byItem.keys()]);
  const updates = objects
    .filter((object) => (object as { type?: string }).type === "ITEM")
    .map((object) => {
      const copy = cloneForWrite(object);
      const itemId = String(copy.id);
      const group = byItem.get(itemId) ?? [];
      for (const row of group) {
        const change = input.changes.find((entry) => entry.variationId === row.id);
        if (!change) continue;
        const variation = (copy.itemData?.variations ?? []).find((entry: { id?: string }) => entry.id === row.id);
        if (!variation?.itemVariationData) {
          throw new Error(`Square did not return the full item for ${row.sku || row.name}. Sync and try again.`);
        }
        const current = variation.itemVariationData.priceMoney ?? {};
        variation.itemVariationData.priceMoney = {
          ...current,
          amount: BigInt(change.amount),
          currency: current.currency ?? row.currency ?? "USD",
        };
        variation.itemVariationData.pricingType = "FIXED_PRICING";
      }
      sanitizeCatalogItemForWrite(copy);
      return copy;
    });
  if (updates.length !== byItem.size) throw new Error("Square did not return every item in this price change. Nothing was published.");
  await upsertCatalogObjects(updates, crypto.randomUUID());
  try {
    await refreshItems([...byItem.keys()]);
  } catch {
    for (const change of input.changes) {
      await prisma.variation.update({ where: { id: change.variationId }, data: { priceAmount: change.amount } });
    }
  }
  await recordPriceResults(rows, input, "published");
  return { demo: false, message: "Square accepted the new prices." };
}

async function publishDemoPrices(
  rows: { id: string; priceAmount: number | null; currency: string }[],
  input: { planName?: string | null; changes: { variationId: string; amount: number }[] },
) {
  await recordPriceResults(rows, input, "demo");
  for (const change of input.changes) {
    await prisma.variation.update({ where: { id: change.variationId }, data: { priceAmount: change.amount } });
    await markReprint(change.variationId, change.amount);
  }
  return { demo: true, message: "Demo prices were updated on this Mac. Square was not changed." };
}

async function recordPriceResults(
  rows: { id: string; priceAmount: number | null; currency: string }[],
  input: { planName?: string | null; changes: { variationId: string; amount: number }[] },
  status: string,
) {
  for (const change of input.changes) {
    const current = rows.find((row) => row.id === change.variationId);
    await prisma.priceChange.create({
      data: {
        variationId: change.variationId,
        oldAmount: current?.priceAmount,
        newAmount: change.amount,
        currency: current?.currency ?? "USD",
        planName: input.planName || null,
        status,
      },
    });
    await markReprint(change.variationId, change.amount);
  }
  await prisma.priceDraft.deleteMany({ where: { variationId: { in: input.changes.map((change) => change.variationId) } } });
}

async function markReprint(variationId: string, amount: number) {
  const profile = await prisma.labelProfile.findUnique({ where: { variationId } });
  if (profile?.showPrice && profile.labelsPrinted > 0 && profile.lastPrintedPrice !== amount) {
    await prisma.labelProfile.update({ where: { variationId }, data: { needsReprint: true } });
  }
}

export async function savePriceDrafts(input: {
  planName?: string | null;
  changes: { variationId: string; baselineAmount: number; proposedAmount: number }[];
}) {
  await prisma.priceDraft.deleteMany({});
  if (input.changes.length) {
    await prisma.priceDraft.createMany({
      data: input.changes.map((change) => ({
        variationId: change.variationId,
        baselineAmount: change.baselineAmount,
        proposedAmount: change.proposedAmount,
        planName: input.planName || null,
      })),
    });
  }
  return { message: "Draft saved on this Mac. Square prices are unchanged until you publish." };
}

export async function updateSku(input: { variationId: string; sku: string; confirm: boolean }) {
  requireConfirm(input.confirm, "Confirm the SKU before it is saved.");
  const sku = normalizeSku(input.sku);
  const variation = await variationOrThrow(input.variationId);
  const existing = await prisma.variation.findMany({ select: { id: true, sku: true } });
  if (skuCollision(sku, existing, variation.id)) throw new Error("That SKU is already used by another variation.");
  if (!hasSquareToken() || variation.source === "demo") {
    if (variation.source === "square") {
      throw new Error("The Square token is missing, so the SKU was not changed.");
    }
    await prisma.variation.update({ where: { id: variation.id }, data: { sku } });
    return { demo: true, sku, message: "SKU saved in demo mode. Square was not changed." };
  }
  const [object] = (await retrieveCatalogItems([variation.itemId])).filter((entry) => (entry as { type?: string }).type === "ITEM");
  if (!object) throw new Error("Square could not find the parent item. Nothing was changed.");
  const copy = cloneForWrite(object);
  const target = (copy.itemData?.variations ?? []).find((entry: { id?: string }) => entry.id === variation.id);
  if (!target?.itemVariationData) throw new Error("Square did not return that variation. Nothing was changed.");
  target.itemVariationData.sku = sku;
  sanitizeCatalogItemForWrite(copy);
  await upsertCatalogObjects([copy], crypto.randomUUID());
  await refreshItems([variation.itemId]);
  return { demo: false, sku, message: "Square accepted the SKU. The GTIN was left untouched." };
}

export async function adjustStock(input: {
  confirm: boolean;
  variationId: string;
  locationId: string;
  reason: StockReason;
  quantity: string;
}) {
  requireConfirm(input.confirm, "Confirm the stock change before it is written.");
  const variation = await variationOrThrow(input.variationId);
  const location = await prisma.squareLocation.findUnique({ where: { id: input.locationId } });
  if (!location) throw new Error("Choose a location first.");
  if (variation.source !== location.source) {
    throw new Error("That location does not belong to this catalog.");
  }
  const change = describeStockChange(input.reason, input.quantity);
  const idempotencyKey = crypto.randomUUID();
  if (!hasSquareToken() || variation.source === "demo") {
    if (variation.source === "square") throw new Error("The Square token is missing, so stock was not changed.");
    if (!variation.trackInventory) throw new Error("Inventory tracking is off for this demo variation.");
    const current = await prisma.inventoryCount.findUnique({
      where: { variationId_locationId_state: { variationId: variation.id, locationId: location.id, state: "IN_STOCK" } },
    });
    const currentQty = Number(current?.quantity ?? 0);
    const delta = Number(change.quantity);
    const next = change.type === "PHYSICAL_COUNT" ? delta : change.toState === "IN_STOCK" ? currentQty + delta : currentQty - delta;
    if (next < 0) throw new Error("That quantity is larger than the current demo stock.");
    await prisma.inventoryCount.upsert({
      where: { variationId_locationId_state: { variationId: variation.id, locationId: location.id, state: "IN_STOCK" } },
      create: { variationId: variation.id, locationId: location.id, state: "IN_STOCK", quantity: String(next) },
      update: { quantity: String(next), calculatedAt: new Date() },
    });
    await prisma.stockAdjustment.create({
      data: {
        variationId: variation.id,
        locationId: location.id,
        reason: input.reason,
        quantity: change.quantity,
        changeType: change.type,
        fromState: change.fromState,
        toState: change.toState,
        idempotencyKey,
        status: "demo",
      },
    });
    return { demo: true, message: "Demo stock updated on this Mac. Square was not changed." };
  }
  if (!variation.trackInventory) {
    throw new Error("Square is not tracking inventory for this variation. Turn tracking on before adjusting stock.");
  }
  await prisma.stockAdjustment.create({
    data: {
      variationId: variation.id,
      locationId: location.id,
      reason: input.reason,
      quantity: change.quantity,
      changeType: change.type,
      fromState: change.fromState,
      toState: change.toState,
      idempotencyKey,
      status: "pending",
    },
  });
  try {
    await createInventoryChange({
      idempotencyKey,
      type: change.type,
      variationId: variation.id,
      locationId: location.id,
      quantity: change.quantity,
      fromState: change.fromState,
      toState: change.toState ?? "IN_STOCK",
    });
    await refreshItems([variation.itemId]);
    await prisma.stockAdjustment.update({ where: { idempotencyKey }, data: { status: "published" } });
    return { demo: false, message: "Square accepted the inventory change." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Square rejected the inventory change.";
    await prisma.stockAdjustment.update({ where: { idempotencyKey }, data: { status: "failed", error: message } });
    throw error;
  }
}

export async function createCatalogProduct(input: {
  name: string;
  description: string;
  variationName: string;
  price: string;
  sku?: string;
  categoryId?: string;
  categoryName?: string;
  trackInventory: boolean;
}) {
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Enter a product name.");
  const priceAmount = dollarsToCents(input.price);
  const sku = input.sku?.trim() ? normalizeSku(input.sku) : null;
  const source = hasSquareToken() ? "square" : "demo";
  const namedCategory = input.categoryName?.trim();
  const existingCategory = input.categoryId
    ? null
    : namedCategory
      ? await prisma.category.findFirst({ where: { name: namedCategory, source } })
      : null;
  const categoryId = input.categoryId || existingCategory?.id || null;
  if (sku) {
    const existing = await prisma.variation.findMany({ select: { id: true, sku: true } });
    if (skuCollision(sku, existing)) throw new Error("That SKU is already used.");
  }
  if (!hasSquareToken()) {
    const itemId = `demo-item-${crypto.randomUUID()}`;
    const variationId = `demo-var-${crypto.randomUUID()}`;
    let demoCategoryId = categoryId;
    if (!demoCategoryId && namedCategory) {
      demoCategoryId = `demo-cat-${crypto.randomUUID()}`;
      await prisma.category.create({ data: { id: demoCategoryId, name: namedCategory, source: "demo" } });
    }
    await prisma.catalogItem.create({
      data: {
        id: itemId,
        source: "demo",
        name,
        description: input.description.trim(),
        categoryId: demoCategoryId,
        variations: {
          create: {
            id: variationId,
            source: "demo",
            name: input.variationName.trim() || "Regular",
            sku,
            priceAmount,
            currency: "USD",
            trackInventory: input.trackInventory,
          },
        },
      },
    });
    return { demo: true, itemId, message: "Product saved in demo mode. Square was not changed." };
  }
  const objects: unknown[] = [];
  if (!categoryId && namedCategory) {
    objects.push({
      type: "CATEGORY",
      id: "#category",
      categoryData: { name: namedCategory },
    });
  }
  objects.push({
    type: "ITEM",
    id: "#item",
    itemData: {
      name,
      description: input.description.trim(),
      productType: "REGULAR",
      categories: categoryId ? [{ id: categoryId }] : namedCategory ? [{ id: "#category" }] : undefined,
      variations: [
        {
          type: "ITEM_VARIATION",
          id: "#variation",
          itemVariationData: {
            itemId: "#item",
            name: input.variationName.trim() || "Regular",
            sku: sku ?? undefined,
            pricingType: "FIXED_PRICING",
            priceMoney: { amount: BigInt(priceAmount), currency: "USD" },
            trackInventory: input.trackInventory,
          },
        },
      ],
    },
  });
  const result = await upsertCatalogObjects(objects, crypto.randomUUID());
  const itemId = result.idMappings.find((mapping) => mapping.clientObjectId === "#item")?.objectId;
  if (!itemId) throw new Error("Square did not return the new product. Check the Square catalog before trying again.");
  await refreshItems([itemId]);
  return { demo: false, itemId, message: "Square created the product." };
}

export async function updateCatalogItem(input: {
  confirm: boolean;
  itemId: string;
  name?: string;
  description?: string;
  categoryId?: string | null;
  archive?: boolean;
}) {
  requireConfirm(input.confirm, "Confirm this catalog change before it is sent to Square.");
  const item = await prisma.catalogItem.findUnique({ where: { id: input.itemId } });
  if (!item) throw new Error("That product is not in the catalog.");
  if (!hasSquareToken() || item.source === "demo") {
    if (item.source === "square") throw new Error("The Square token is missing, so the product was not changed.");
    await prisma.catalogItem.update({
      where: { id: item.id },
      data: {
        name: input.name?.trim() || item.name,
        description: input.description ?? item.description,
        categoryId: input.categoryId === undefined ? item.categoryId : input.categoryId,
        isArchived: input.archive ?? item.isArchived,
      },
    });
    if (input.archive) {
      await prisma.variation.updateMany({ where: { itemId: item.id }, data: { isArchived: true } });
    }
    return { demo: true, message: input.archive ? "Demo product archived on this Mac. Square was not changed." : "Demo product updated. Square was not changed." };
  }
  const [object] = (await retrieveCatalogItems([item.id])).filter((entry) => (entry as { type?: string }).type === "ITEM");
  if (!object) throw new Error("Square could not find that product. Nothing was changed.");
  const copy = cloneForWrite(object);
  if (input.name?.trim()) copy.itemData.name = input.name.trim();
  if (input.description != null) copy.itemData.description = input.description;
  if (input.categoryId) copy.itemData.categories = [{ id: input.categoryId }];
  if (input.archive) copy.itemData.isArchived = true;
  sanitizeCatalogItemForWrite(copy);
  await upsertCatalogObjects([copy], crypto.randomUUID());
  await refreshItems([item.id]);
  return { demo: false, message: input.archive ? "Square archived the product." : "Square updated the product." };
}

export async function enableTracking(input: { variationId: string; confirm: boolean }) {
  requireConfirm(input.confirm, "Confirm inventory tracking before it is turned on in Square.");
  const variation = await variationOrThrow(input.variationId);
  if (!hasSquareToken() || variation.source === "demo") {
    if (variation.source === "square") throw new Error("The Square token is missing, so tracking was not changed.");
    await prisma.variation.update({ where: { id: variation.id }, data: { trackInventory: true } });
    return { demo: true, message: "Tracking is on for this demo variation. Square was not changed." };
  }
  const [object] = (await retrieveCatalogItems([variation.itemId])).filter((entry) => (entry as { type?: string }).type === "ITEM");
  if (!object) throw new Error("Square could not find that product. Tracking was not changed.");
  const copy = cloneForWrite(object);
  const target = (copy.itemData?.variations ?? []).find((entry: { id?: string }) => entry.id === variation.id);
  if (!target?.itemVariationData) throw new Error("Square did not return that variation. Tracking was not changed.");
  target.itemVariationData.trackInventory = true;
  sanitizeCatalogItemForWrite(copy);
  await upsertCatalogObjects([copy], crypto.randomUUID());
  await refreshItems([variation.itemId]);
  return { demo: false, message: "Square is now tracking inventory for that variation." };
}

function clean(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
