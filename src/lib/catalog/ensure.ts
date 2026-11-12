import { ensureDatabaseReady } from "@/lib/catalog/ensure-database";
import { hydrateHostedDatabaseFromBlob } from "@/lib/catalog/hosted-db-blob";
import { prisma } from "@/lib/db";
import { startingTemplate } from "@/lib/labels/types";
import { purgeDemoCatalog } from "@/lib/catalog/purge-demo";
import { hasSquareToken } from "@/lib/utils";

const PLANS = [
  {
    name: "Regular Pricing",
    description: "Everyday prices. Saving or opening this plan does not change Square.",
    rules: [] as unknown[],
  },
  {
    name: "Christmas Market Pricing",
    description: "A saved 10% increase for necklaces. It is not scheduled. Square changes only after you publish a preview.",
    rules: [{ mode: "percent", amount: 10, categoryName: "Necklaces", round: "none" }],
  },
  {
    name: "Holiday Clearance",
    description: "A saved 20% decrease with .99 rounding for every priced variation. Nothing is sent to Square until you publish it.",
    rules: [{ mode: "percent", amount: -20, categoryName: null, round: "charm_99" }],
  },
];

export async function ensureDefaults() {
  if ((await prisma.labelTemplate.count()) === 0) {
    const template = startingTemplate();
    await prisma.labelTemplate.create({
      data: {
        name: template.name,
        widthMm: template.widthMm,
        heightMm: template.heightMm,
        marginMm: template.marginMm,
        elements: JSON.stringify(template.elements),
        isDefault: true,
      },
    });
  }
  if ((await prisma.printerPreset.count()) === 0) {
    await prisma.printerPreset.create({
      data: {
        name: "1/2 × 1 in, two across",
        manufacturer: "DYMO",
        model: "LabelWriter 450 Turbo",
        widthMm: 12.7,
        heightMm: 25.4,
        orientation: "portrait",
        columns: 2,
        columnGapMm: 2,
        partNumber: "",
        density: "barcode",
        isDefault: true,
      },
    });
  }
  if ((await prisma.pricePlan.count()) === 0) {
    await prisma.pricePlan.createMany({
      data: PLANS.map((plan) => ({ ...plan, rules: JSON.stringify(plan.rules) })),
    });
  }
}

export async function ensureStudio() {
  await hydrateHostedDatabaseFromBlob();
  ensureDatabaseReady();
  await ensureDefaults();
  const token = hasSquareToken();
  const squareCount = await prisma.variation.count({ where: { source: "square", absentFromSquare: false } });
  if (token || squareCount > 0) await purgeDemoCatalog();
  const demoCount = await prisma.variation.count({ where: { source: "demo" } });
  if (!token && squareCount === 0 && demoCount === 0) await seedDemo();
}

async function seedDemo() {
  const locationId = "demo-location";
  await prisma.squareLocation.create({
    data: { id: locationId, source: "demo", name: "Studio (demo)", status: "ACTIVE", currency: "USD", timezone: "America/New_York" },
  });
  const categories = [
    ["demo-cat-bracelets", "Bracelets"],
    ["demo-cat-necklaces", "Necklaces"],
    ["demo-cat-rings", "Rings"],
    ["demo-cat-earrings", "Earrings"],
    ["demo-cat-chains", "Hand Chains"],
    ["demo-cat-keys", "Keychains"],
    ["demo-cat-charms", "Charms"],
  ] as const;
  await prisma.category.createMany({
    data: categories.map(([id, name]) => ({ id, name, source: "demo" })),
  });
  const products = [
    ["bracelet", "Gold Filled Bracelet", "Permanent jewelry bracelet", "demo-cat-bracelets", "Regular", "LE-BR-GF-001", 4800, true, "12", "Gold filled", "Gold Filled Bracelet"],
    ["silver", "Sterling Silver Bracelet", "Sterling silver bracelet", "demo-cat-bracelets", "Regular", "LE-BR-SS-001", 4200, true, "8", "Sterling silver", "Sterling Silver Bracelet"],
    ["necklace", "Gold Filled Necklace", "Everyday necklace", "demo-cat-necklaces", "18 inch", "LE-NK-GF-001", 6800, true, "5", "Gold filled", "Gold Filled Necklace"],
    ["ring", "Sterling Silver Ring", "Stacking ring", "demo-cat-rings", "Regular", "LE-RG-SS-001", 3600, true, "0", "Sterling silver", null],
    ["earrings", "Gold Filled Earrings", "Pair of hoops", "demo-cat-earrings", "Pair", "LE-ER-GF-001", 3200, true, "2", "Gold filled", null],
    ["chain", "Gold Filled Hand Chain", "Hand chain", "demo-cat-chains", "Regular", "LE-HC-GF-001", 5400, true, "4", "Gold filled", null],
    ["key", "Gold Filled Keychain", "Holiday keychain", "demo-cat-keys", "Regular", "LE-KC-GF-001", 1800, true, "15", "Gold filled", null],
    ["engraved", "Engraved Bar Necklace", "Bar necklace, ready for engraving", "demo-cat-necklaces", "Regular", null, 6400, true, "6", "Gold filled", null],
    ["charm", "Holiday Charm", "Market charm", "demo-cat-charms", "Regular", null, 2200, false, "9", null, null],
  ] as const;

  for (const [slug, name, description, categoryId, variationName, sku, price, track, quantity, material, displayName] of products) {
    const itemId = `demo-item-${slug}`;
    const variationId = `demo-var-${slug}`;
    await prisma.catalogItem.create({
      data: {
        id: itemId,
        source: "demo",
        name,
        description,
        categoryId,
        variations: {
          create: {
            id: variationId,
            source: "demo",
            name: variationName,
            sku,
            priceAmount: price,
            currency: "USD",
            trackInventory: track,
            counts: track
              ? { create: { locationId, state: "IN_STOCK", quantity, calculatedAt: new Date() } }
              : undefined,
            label: displayName
              ? {
                  create: {
                    displayName,
                    material,
                    showPrice: slug === "necklace",
                    barcodeValue: sku,
                    barcodeFormat: "code128",
                    barcodeSource: "sku",
                    labelsPrinted: slug === "necklace" ? 4 : 0,
                    lastPrintedPrice: slug === "necklace" ? price : null,
                    lastPrintedAt: slug === "necklace" ? new Date() : null,
                  },
                }
              : undefined,
          },
        },
      },
    });
  }
}
