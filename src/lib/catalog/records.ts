import { prisma } from "@/lib/db";
import { ensureLabelTagColumn } from "@/lib/catalog/tag-column";
import { setSetting } from "@/lib/settings";
import { jewelryScanCheck } from "@/lib/barcodes/fit";
import { elementsForDymoPrint } from "@/lib/labels/dymo-print-elements";
import { isJewelryLabelSize } from "@/lib/labels/jewelry-dymo-layout";
import { assessBarcodeForDymo } from "@/lib/labels/scan";
import { resolveLabelContent } from "@/lib/labels/resolve";
import type { PdfLabel } from "@/lib/labels/pdf";
import type { LabelElement } from "@/lib/labels/types";
import type { VariationRow } from "@/lib/catalog/studio";

export function buildLabelBatch(input: {
  variations: VariationRow[];
  quantities: { variationId: string; quantity: number }[];
  elements: LabelElement[];
  templateWidth: number;
  templateHeight: number;
  widthMm: number;
  heightMm: number;
  scale: number;
  logo: string | null;
}) {
  if (Math.abs(input.templateWidth - input.widthMm) > 0.3 || Math.abs(input.templateHeight - input.heightMm) > 0.3) {
    throw new Error(
      `The template is ${input.templateWidth} × ${input.templateHeight} mm, but the label stock is ${input.widthMm} × ${input.heightMm} mm. Match them before printing.`,
    );
  }
  const jewelry = isJewelryLabelSize(input.widthMm, input.heightMm);
  const elements = jewelry ? elementsForDymoPrint(input.elements, input.widthMm, input.heightMm) : input.elements;
  const labels: PdfLabel[] = [];
  const summary: { variationId: string; quantity: number; encodedValue: string; productName: string; displayName: string }[] = [];
  for (const request of input.quantities) {
    if (!Number.isInteger(request.quantity) || request.quantity < 1) continue;
    const variation = input.variations.find((row) => row.id === request.variationId);
    if (!variation) throw new Error("A selected product is no longer in the catalog.");
    if (!variation.barcodeValue) throw new Error(`${variation.itemName} has no barcode yet. Create one in the Barcode Generator before printing.`);
    const encoded = variation.barcodeValue;
    const barcode = elements.find((element) => element.visible && element.type === "barcode");
    if (barcode) {
      const check = jewelry
        ? jewelryScanCheck(encoded, variation.barcodeFormat)
        : assessBarcodeForDymo({
            text: variation.barcodeValue,
            format: variation.barcodeFormat,
            widthMm: barcode.width * input.scale,
            heightMm: barcode.height * input.scale,
            rotation: barcode.rotation,
          });
      if (!check.ok) throw new Error(`${variation.itemName}: ${check.reason}`);
    }
    const content = resolveLabelContent({ ...variation, barcodeValue: encoded, logo: input.logo });
    summary.push({
      variationId: variation.id,
      quantity: request.quantity,
      encodedValue: encoded,
      productName: variation.itemName,
      displayName: content.displayName,
    });
    for (let copy = 0; copy < request.quantity; copy += 1) {
      labels.push({
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        elements,
        content,
        format: variation.barcodeFormat,
      });
    }
  }
  if (!labels.length) throw new Error("Choose at least one label.");
  if (labels.length > 500) throw new Error("This batch is over 500 labels. Split it and print again.");
  return { labels, summary };
}

export async function markTagged(input: { variationIds: string[]; tagged: boolean }) {
  await ensureLabelTagColumn();
  const variationIds = [...new Set(input.variationIds.map((id) => id.trim()).filter(Boolean))];
  if (!variationIds.length) throw new Error("Choose a product to check off.");
  await prisma.labelProfile.updateMany({
    where: { variationId: { in: variationIds } },
    data: { taggedAt: input.tagged ? new Date() : null },
  });
  return { message: input.tagged ? "Marked as tagged." : "Tag check cleared." };
}

export async function recordPrintJob(input: {
  method: "pdf" | "dymo";
  status: "exported" | "printed" | "failed";
  templateId?: string | null;
  presetId?: string | null;
  note?: string | null;
  items: { variationId: string; quantity: number; encodedValue: string; productName: string; displayName: string }[];
}) {
  await ensureLabelTagColumn();
  const totalLabels = input.items.reduce((total, item) => total + item.quantity, 0);
  const job = await prisma.printJob.create({
    data: {
      method: input.method,
      status: input.status,
      templateId: input.templateId || null,
      presetId: input.presetId || null,
      totalLabels,
      note: input.note || null,
      items: { create: input.items },
    },
  });
  if (input.status === "printed" || input.status === "exported") {
    for (const item of input.items) {
      const variation = await prisma.variation.findUnique({ where: { id: item.variationId }, select: { priceAmount: true } });
      const profile = await prisma.labelProfile.findUnique({ where: { variationId: item.variationId } });
      if (!profile) continue;
      await prisma.labelProfile.update({
        where: { variationId: item.variationId },
        data: {
          labelsPrinted: { increment: item.quantity },
          lastPrintedAt: new Date(),
          lastPrintedPrice: profile.showPrice ? variation?.priceAmount ?? profile.lastPrintedPrice : profile.lastPrintedPrice,
          needsReprint: false,
          taggedAt: null,
        },
      });
    }
  }
  return job;
}

export async function saveTemplate(input: {
  id?: string;
  name: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  elements: LabelElement[];
  isDefault?: boolean;
}) {
  if (input.widthMm < 10 || input.heightMm < 8 || input.widthMm > 150 || input.heightMm > 150) {
    throw new Error("Label dimensions look wrong. Enter the actual stock size in millimeters.");
  }
  if (input.isDefault) await prisma.labelTemplate.updateMany({ data: { isDefault: false } });
  const data = {
    name: input.name.trim() || "Untitled template",
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    marginMm: input.marginMm,
    elements: JSON.stringify(input.elements),
    isDefault: Boolean(input.isDefault),
  };
  if (input.id) return prisma.labelTemplate.update({ where: { id: input.id }, data });
  return prisma.labelTemplate.create({ data });
}

export async function savePreset(input: {
  id?: string;
  name: string;
  manufacturer: string;
  model: string;
  widthMm: number;
  heightMm: number;
  orientation: string;
  columns?: number;
  columnGapMm?: number;
  partNumber?: string;
  density: string;
  offsetXMm: number;
  offsetYMm: number;
  scale: number;
  isDefault?: boolean;
}) {
  const columns = Math.max(1, Math.min(4, Math.round(input.columns ?? 1)));
  const columnGapMm = input.columnGapMm ?? 0;
  if (input.widthMm <= 0 || input.heightMm <= 0) throw new Error("Enter the label width and height from the stock you bought.");
  if (columnGapMm < 0 || columnGapMm > 15) throw new Error("The gap between the side-by-side labels should be between 0 and 15 mm.");
  if (input.scale < 0.9 || input.scale > 1.1) {
    throw new Error("Keep print scale between 90% and 110%. Barcodes fail when the page is shrunk to fit.");
  }
  if (input.isDefault) await prisma.printerPreset.updateMany({ data: { isDefault: false } });
  const data = {
    name: input.name.trim() || "Printer preset",
    manufacturer: input.manufacturer.trim() || "DYMO",
    model: input.model.trim() || "LabelWriter 450 Turbo",
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    orientation: input.orientation === "portrait" ? "portrait" : "landscape",
    columns,
    columnGapMm,
    partNumber: input.partNumber?.trim() || null,
    density: input.density || "barcode",
    offsetXMm: input.offsetXMm,
    offsetYMm: input.offsetYMm,
    scale: input.scale,
    isDefault: Boolean(input.isDefault),
  };
  if (input.id) return prisma.printerPreset.update({ where: { id: input.id }, data });
  return prisma.printerPreset.create({ data });
}

export async function saveBarcodeTest(input: {
  id?: string;
  variationId: string;
  format: string;
  identifierField: string;
  encodedValue: string;
  result: "pending" | "matched" | "mismatched" | "unscannable";
  priceMatched?: boolean | null;
  notes?: string | null;
  printed?: boolean;
}) {
  const data = {
    variationId: input.variationId,
    format: input.format,
    identifierField: input.identifierField,
    encodedValue: input.encodedValue,
    result: input.result,
    priceMatched: input.priceMatched ?? null,
    notes: input.notes?.trim() || null,
    printedAt: input.printed ? new Date() : undefined,
  };
  const test = input.id
    ? await prisma.barcodeTest.update({ where: { id: input.id }, data })
    : await prisma.barcodeTest.create({ data });
  if (input.result === "matched") {
    await setSetting("barcodeVerification", {
      verified: true,
      format: input.format,
      identifierField: input.identifierField,
      testedAt: new Date().toISOString(),
      variationId: input.variationId,
      encodedValue: input.encodedValue,
      notes: input.notes?.trim() || undefined,
    });
  }
  return test;
}

export async function savePlan(input: { id?: string; name: string; description: string; rules: unknown }) {
  const data = {
    name: input.name.trim(),
    description: input.description.trim(),
    rules: JSON.stringify(input.rules),
  };
  if (!data.name) throw new Error("Name the pricing plan.");
  if (input.id) return prisma.pricePlan.update({ where: { id: input.id }, data });
  return prisma.pricePlan.create({ data });
}

export async function saveLogo(dataUrl: string | null) {
  if (dataUrl && !dataUrl.startsWith("data:image/")) throw new Error("Upload a PNG or JPEG logo.");
  if (dataUrl && dataUrl.length > 450_000) throw new Error("That logo is too large. Use an image under about 300 KB.");
  await setSetting("brandLogo", dataUrl);
}
