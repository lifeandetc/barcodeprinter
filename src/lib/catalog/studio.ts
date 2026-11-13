import { cache } from "react";
import { prisma } from "@/lib/db";
import { applyCategoryFocus, CATEGORY_FOCUS_KEY, categoryLabel, type CategoryFocus } from "@/lib/catalog/category-focus";
import { ensureStudio } from "@/lib/catalog/ensure";
import { ensureLabelTagColumn } from "@/lib/catalog/tag-column";
import { isTagged } from "@/lib/catalog/tagged";
import { getSetting } from "@/lib/settings";
import { hasSquareToken, squareEnvironment } from "@/lib/utils";
import type { PriceRule } from "@/lib/pricing/calc";
import { parseElements, type LabelElement } from "@/lib/labels/types";

export type BarcodeVerification = {
  verified: true;
  format: string;
  identifierField: string;
  testedAt: string;
  variationId: string;
  encodedValue: string;
  notes?: string;
};

export const getStudioData = cache(async function getStudioData() {
  try {
    await ensureStudio();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/no such table|does not exist|DATABASE_URL|Environment variable not found/i.test(message)) {
      const hosted = Boolean(process.env.NETLIFY) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
      return {
        ready: false as const,
        setupError: hosted
          ? "The hosted database is not ready. In Netlify, set DATABASE_URL to file:/tmp/life-etc.db for production (builds, functions, and runtime), then clear cache and redeploy."
          : "The database is not ready. In the dashboard folder, run npm run setup.",
      };
    }
    throw error;
  }
  await ensureLabelTagColumn();

  const token = hasSquareToken();
  const squareCount = await prisma.variation.count({ where: { source: "square", absentFromSquare: false } });
  const mode = token && squareCount > 0 ? "square" : token ? "unconnected" : squareCount > 0 ? "offline" : "demo";
  const source = mode === "demo" ? "demo" : "square";

  const [rows, locations, templates, presets, plans, drafts, jobs, adjustments, priceChanges, tests, syncs, webhooks, thresholds, categoryFocus] =
    await Promise.all([
      prisma.variation.findMany({
        where: { source, absentFromSquare: false },
        include: { item: { include: { category: true } }, counts: { include: { location: true } }, label: true },
      }),
      prisma.squareLocation.findMany({ where: { source }, orderBy: { name: "asc" } }),
      prisma.labelTemplate.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.printerPreset.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.pricePlan.findMany({ orderBy: { name: "asc" } }),
      prisma.priceDraft.findMany({
        where: { variation: { source } },
        include: { variation: { include: { item: true } } },
      }),
      prisma.printJob.findMany({ include: { items: true }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.stockAdjustment.findMany({
        where: { variation: { source } },
        include: { variation: { include: { item: true } } },
        orderBy: { occurredAt: "desc" },
        take: 30,
      }),
      prisma.priceChange.findMany({
        where: { variation: { source } },
        include: { variation: { include: { item: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.barcodeTest.findMany({
        where: { variation: { source } },
        include: { variation: { include: { item: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.syncRun.findMany({ orderBy: { startedAt: "desc" }, take: 30 }),
      prisma.webhookEvent.findMany({ orderBy: { receivedAt: "desc" }, take: 20 }),
      prisma.lowStockThreshold.findMany(),
      getSetting<CategoryFocus>(CATEGORY_FOCUS_KEY, { enabled: false, names: [] }),
    ]);

  const lowStockDefault = await getSetting<number>("lowStockDefault", 3);
  const verification = await getSetting<BarcodeVerification | null>("barcodeVerification", null);
  const logo = await getSetting<string | null>("brandLogo", null);
  const thresholdFor = (variationId: string, locationId: string) =>
    thresholds.find((row) => row.variationId === variationId && row.locationId === locationId)?.threshold ?? lowStockDefault;

  const variations = rows
    .map((row) => {
      const stockByLocation = locations.map((location) => {
        const quantity = row.counts
          .filter((count) => count.locationId === location.id && count.state === "IN_STOCK")
          .reduce((total, count) => total + Number(count.quantity || 0), 0);
        return { locationId: location.id, locationName: location.name, quantity };
      });
      const stock = stockByLocation.reduce((total, location) => total + location.quantity, 0);
      return {
        id: row.id,
        itemId: row.itemId,
        source: row.source,
        itemName: row.item.name,
        description: row.item.description,
        variationName: row.name || "Default",
        sku: row.sku,
        gtin: row.gtin,
        priceAmount: row.priceAmount,
        currency: row.currency,
        trackInventory: row.trackInventory,
        categoryId: row.item.categoryId,
        categoryName: row.item.category?.name ?? null,
        imageUrl: row.item.imageUrl,
        stock,
        stockByLocation,
        low: row.trackInventory && stock > 0 && stock <= Math.min(...locations.map((location) => thresholdFor(row.id, location.id)), lowStockDefault),
        barcodeValue: row.label?.barcodeValue ?? null,
        barcodeFormat: row.label?.barcodeFormat ?? verification?.format ?? "code128",
        barcodeSource: row.label?.barcodeSource ?? null,
        displayName: row.label?.displayName ?? null,
        customText: row.label?.customText ?? null,
        material: row.label?.material ?? null,
        details: row.label?.details ?? null,
        showPrice: row.label?.showPrice ?? false,
        templateId: row.label?.templateId ?? null,
        labelsPrinted: row.label?.labelsPrinted ?? 0,
        needsReprint: row.label?.needsReprint ?? false,
        lastPrintedAt: row.label?.lastPrintedAt?.toISOString() ?? null,
        taggedAt: row.label?.taggedAt?.toISOString() ?? null,
        syncedAt: (row.squareUpdatedAt ?? row.syncedAt).toISOString(),
        isArchived: row.isArchived || row.item.isArchived,
        sellable: row.sellable,
      };
    })
    .sort((left, right) => left.itemName.localeCompare(right.itemName) || left.variationName.localeCompare(right.variationName));

  const catalogCategories = [
    ...new Set(
      variations.filter((variation) => !variation.isArchived).map((variation) => categoryLabel(variation.categoryName)),
    ),
  ].sort((left, right) => left.localeCompare(right));

  const visibleVariations = applyCategoryFocus(variations, categoryFocus);
  const hiddenByCategoryFocus = Math.max(0, variations.filter((v) => !v.isArchived).length - visibleVariations.filter((v) => !v.isArchived).length);
  const visibleIds = new Set(visibleVariations.map((variation) => variation.id));

  const recentTagIds = new Set(jobs.flatMap((job) => job.items.map((item) => item.variationId)));
  const active = visibleVariations.filter((variation) => !variation.isArchived);
  const categoryCounts = new Map<string, number>();
  for (const variation of active) {
    const name = categoryLabel(variation.categoryName);
    categoryCounts.set(name, (categoryCounts.get(name) ?? 0) + 1);
  }
  const lastSync = syncs[0]
    ? {
        status: syncs[0].status,
        trigger: syncs[0].trigger,
        startedAt: syncs[0].startedAt.toISOString(),
        finishedAt: syncs[0].finishedAt?.toISOString() ?? null,
        error: syncs[0].error,
        itemsSeen: syncs[0].itemsSeen,
        variationsSeen: syncs[0].variationsSeen,
        conflicts: syncs[0].conflicts,
        details: JSON.parse(syncs[0].details || "[]") as string[],
      }
    : null;

  const connection = connectionState(mode, lastSync);

  return {
    ready: true as const,
    mode,
    environment: token ? squareEnvironment() : null,
    connection,
    lastSync,
    lowStockDefault,
    verification,
    logo,
    locations: locations.map((location) => ({
      id: location.id,
      name: location.name,
      status: location.status,
      address: location.address,
      timezone: location.timezone,
      currency: location.currency,
    })),
    categories: [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    categoryFocus,
    hiddenByCategoryFocus,
    catalogCategories,
    variations: visibleVariations,
    stats: {
      products: new Set(active.map((variation) => variation.itemId)).size,
      variations: active.length,
      units: active.reduce((total, variation) => total + (variation.trackInventory ? variation.stock : 0), 0),
      outOfStock: active.filter((variation) => variation.trackInventory && variation.stock <= 0).length,
      lowStock: active.filter((variation) => variation.low).length,
      missingBarcodes: active.filter((variation) => !variation.barcodeValue).length,
      needsLabels: active.filter((variation) => !variation.labelsPrinted || variation.needsReprint).length,
      waitingToTag: active.filter((variation) => recentTagIds.has(variation.id) && variation.labelsPrinted > 0 && !isTagged(variation)).length,
    },
    templates: templates.map((template) => ({
      id: template.id,
      name: template.name,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      marginMm: template.marginMm,
      isDefault: template.isDefault,
      elements: parseElements(template.elements) as LabelElement[],
      updatedAt: template.updatedAt.toISOString(),
    })),
    presets: presets.map((preset) => ({
      ...preset,
      createdAt: preset.createdAt.toISOString(),
      updatedAt: preset.updatedAt.toISOString(),
    })),
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      rules: JSON.parse(plan.rules) as PriceRule[],
    })),
    drafts: drafts.filter((draft) => visibleIds.has(draft.variationId)).map((draft) => ({
      id: draft.id,
      variationId: draft.variationId,
      itemName: draft.variation.item.name,
      variationName: draft.variation.name,
      baselineAmount: draft.baselineAmount,
      proposedAmount: draft.proposedAmount,
      currentAmount: draft.variation.priceAmount,
      planName: draft.planName,
      stale: draft.variation.priceAmount !== draft.baselineAmount,
    })),
    jobs: jobs.map((job) => ({
      id: job.id,
      method: job.method,
      status: job.status,
      totalLabels: job.totalLabels,
      note: job.note,
      createdAt: job.createdAt.toISOString(),
      items: job.items.map((item) => ({
        variationId: item.variationId,
        quantity: item.quantity,
        encodedValue: item.encodedValue,
        productName: item.productName,
        displayName: item.displayName,
      })),
    })),
    adjustments: adjustments.filter((adjustment) => visibleIds.has(adjustment.variationId)).map((adjustment) => ({
      id: adjustment.id,
      itemName: adjustment.variation.item.name,
      variationName: adjustment.variation.name,
      reason: adjustment.reason,
      quantity: adjustment.quantity,
      status: adjustment.status,
      error: adjustment.error,
      occurredAt: adjustment.occurredAt.toISOString(),
    })),
    priceChanges: priceChanges.filter((change) => visibleIds.has(change.variationId)).map((change) => ({
      id: change.id,
      itemName: change.variation.item.name,
      variationName: change.variation.name,
      oldAmount: change.oldAmount,
      newAmount: change.newAmount,
      currency: change.currency,
      planName: change.planName,
      status: change.status,
      error: change.error,
      createdAt: change.createdAt.toISOString(),
    })),
    tests: tests.filter((test) => visibleIds.has(test.variationId)).map((test) => ({
      id: test.id,
      variationId: test.variationId,
      itemName: test.variation.item.name,
      format: test.format,
      identifierField: test.identifierField,
      encodedValue: test.encodedValue,
      result: test.result,
      priceMatched: test.priceMatched,
      notes: test.notes,
      createdAt: test.createdAt.toISOString(),
    })),
    syncs: syncs.map((run) => ({
      id: run.id,
      trigger: run.trigger,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      itemsSeen: run.itemsSeen,
      variationsSeen: run.variationsSeen,
      conflicts: run.conflicts,
      error: run.error,
      details: JSON.parse(run.details || "[]") as string[],
    })),
    webhooks: webhooks.map((event) => ({
      eventId: event.eventId,
      type: event.type,
      status: event.status,
      receivedAt: event.receivedAt.toISOString(),
      error: event.error,
    })),
    activity: buildActivity(syncs, priceChanges, adjustments, jobs),
  };
});

function connectionState(
  mode: "demo" | "square" | "offline" | "unconnected",
  lastSync: { status: string; error: string | null; finishedAt: string | null } | null,
) {
  if (mode === "demo") {
    return {
      code: mode,
      label: "Demo catalog",
      detail: "No Square token is configured. Sample jewelry is on this Mac only and is not mixed with Square.",
    };
  }
  if (mode === "offline") {
    return {
      code: mode,
      label: "Offline cache",
      detail: "The Square token is missing. This is the last imported catalog, not a live connection.",
    };
  }
  if (mode === "unconnected") {
    return {
      code: mode,
      label: "Token saved",
      detail: "The server has a Square token. Import the catalog to replace the empty workspace.",
    };
  }
  if (lastSync?.status === "failed") {
    return { code: "error" as const, label: "Sync failed", detail: lastSync.error || "The last Square sync failed." };
  }
  if (lastSync?.status === "running") {
    return { code: "square" as const, label: "Syncing", detail: "A Square import is in progress." };
  }
  return { code: "square" as const, label: "Square connected", detail: "Prices and stock shown here come from the last successful Square sync." };
}

function buildActivity(
  syncs: { trigger: string; status: string; startedAt: Date; error: string | null }[],
  prices: { createdAt: Date; status: string; variation: { item: { name: string } }; newAmount: number }[],
  adjustments: { occurredAt: Date; status: string; reason: string; variation: { item: { name: string } } }[],
  jobs: { createdAt: Date; totalLabels: number; method: string; status: string }[],
) {
  return [
    ...syncs.slice(0, 6).map((run) => ({
      at: run.startedAt.toISOString(),
      title: `Square sync ${run.status}`,
      detail: run.error || run.trigger,
    })),
    ...prices.slice(0, 6).map((change) => ({
      at: change.createdAt.toISOString(),
      title: `${change.variation.item.name} price ${change.status}`,
      detail: `${(change.newAmount / 100).toFixed(2)}`,
    })),
    ...adjustments.slice(0, 6).map((adjustment) => ({
      at: adjustment.occurredAt.toISOString(),
      title: `${adjustment.variation.item.name} ${adjustment.reason}`,
      detail: adjustment.status,
    })),
    ...jobs.slice(0, 6).map((job) => ({
      at: job.createdAt.toISOString(),
      title: `${job.totalLabels} labels ${job.status}`,
      detail: job.method,
    })),
  ]
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 8);
}

export type StudioData = Exclude<Awaited<ReturnType<typeof getStudioData>>, { ready: false }>;
export type VariationRow = StudioData["variations"][number];
