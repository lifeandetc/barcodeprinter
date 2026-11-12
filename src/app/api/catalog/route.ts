import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { failure, readJson } from "@/lib/http";
import {
  adjustStock,
  createCatalogProduct,
  enableTracking,
  publishPrices,
  saveBarcode,
  saveLabelProfile,
  savePriceDrafts,
  updateCatalogItem,
  updateSku,
} from "@/lib/catalog/mutations";
import { recordPrintJob, saveBarcodeTest, saveLogo, savePlan, savePreset, saveTemplate } from "@/lib/catalog/records";
import {
  CATEGORY_FOCUS_KEY,
  categoryLabel,
  resolveCategoryFocusNames,
  type CategoryFocus,
} from "@/lib/catalog/category-focus";
import { persistHostedDatabaseToBlob } from "@/lib/catalog/hosted-db-blob";
import { setSetting } from "@/lib/settings";

export async function POST(request: Request) {
  const body = (await readJson(request)) as { action?: string } | null;
  if (!body?.action) return NextResponse.json({ error: "Missing action." }, { status: 400 });
  try {
    const result = await run(body.action, body);
    await persistHostedDatabaseToBlob();
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    return failure(error);
  }
}

async function run(action: string, body: Record<string, unknown>) {
  switch (action) {
    case "createProduct":
      return createCatalogProduct(body as never);
    case "updateItem":
      return updateCatalogItem(body as never);
    case "updateSku":
      return updateSku(body as never);
    case "saveBarcode":
      return saveBarcode(body as never);
    case "saveLabel":
      return saveLabelProfile(body as never);
    case "adjustStock":
      return adjustStock(body as never);
    case "enableTracking":
      return enableTracking(body as never);
    case "publishPrices":
      return publishPrices(body as never);
    case "saveDrafts":
      return savePriceDrafts(body as never);
    case "saveTemplate":
      return saveTemplate(body as never);
    case "deleteTemplate": {
      const count = await prisma.labelTemplate.count();
      if (count <= 1) throw new Error("Keep at least one label template.");
      await prisma.labelTemplate.delete({ where: { id: String(body.id) } });
      return { message: "Template deleted." };
    }
    case "savePreset":
      return savePreset(body as never);
    case "deletePreset": {
      const count = await prisma.printerPreset.count();
      if (count <= 1) throw new Error("Keep at least one label size.");
      await prisma.printerPreset.delete({ where: { id: String(body.id) } });
      return { message: "Label size deleted." };
    }
    case "recordJob":
      return recordPrintJob(body as never);
    case "saveTest":
      return saveBarcodeTest(body as never);
    case "savePlan":
      return savePlan(body as never);
    case "deletePlan":
      await prisma.pricePlan.delete({ where: { id: String(body.id) } });
      return { message: "Pricing plan deleted. Square was not changed." };
    case "saveLogo":
      await saveLogo((body.dataUrl as string | null) ?? null);
      return { message: body.dataUrl ? "Logo saved on this Mac." : "Logo removed." };
    case "setThreshold": {
      const variationId = String(body.variationId);
      const locationId = String(body.locationId);
      const threshold = Number(body.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error("Enter a whole-number threshold.");
      await prisma.lowStockThreshold.upsert({
        where: { variationId_locationId: { variationId, locationId } },
        create: { variationId, locationId, threshold },
        update: { threshold },
      });
      return { message: "Low-stock threshold saved in this app. Square was not changed." };
    }
    case "setLowStockDefault": {
      const threshold = Number(body.threshold);
      if (!Number.isInteger(threshold) || threshold < 0) throw new Error("Enter a whole-number threshold.");
      await setSetting("lowStockDefault", threshold);
      return { message: "Default low-stock threshold saved." };
    }
    case "saveCategoryFocus": {
      const enabled = Boolean(body.enabled);
      const rawNames = Array.isArray(body.names)
        ? [...new Set(body.names.map((name) => String(name).trim()).filter(Boolean))]
        : [];
      const [categoryRows, itemRows] = await Promise.all([
        prisma.category.findMany({ select: { name: true } }),
        prisma.catalogItem.findMany({
          where: { absentFromSquare: false, isArchived: false },
          select: { category: { select: { name: true } } },
        }),
      ]);
      const catalogCategories = [
        ...new Set([
          ...categoryRows.map((row) => categoryLabel(row.name)),
          ...itemRows.map((row) => categoryLabel(row.category?.name)),
        ]),
      ].sort((left, right) => left.localeCompare(right));
      const names = enabled ? resolveCategoryFocusNames(rawNames, catalogCategories) : [];
      if (enabled && names.length === 0) {
        throw new Error(
          catalogCategories.length
            ? `Choose at least one category that exists in Square (for example ${catalogCategories.slice(0, 3).join(", ")}).`
            : "Import Square first, then choose a category.",
        );
      }
      const saved: CategoryFocus = { enabled: enabled && names.length > 0, names };
      await setSetting(CATEGORY_FOCUS_KEY, saved);
      return {
        focus: saved,
        message: saved.enabled
          ? saved.names.length === 1
            ? `Showing “${saved.names[0]}” only across the studio.`
            : `Showing ${saved.names.length} categories only across the studio.`
          : "Category focus is off. The full catalog is visible again.",
      };
    }
    default:
      throw new Error("Unknown action.");
  }
}
