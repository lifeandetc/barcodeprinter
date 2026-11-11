import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { assessBarcode } from "@/lib/labels/scan";
import { mmToPt, mmToTwips, startingTemplate } from "@/lib/labels/types";
import { dymoLabelXml, rowWidthMm } from "@/lib/labels/dymo-xml";
import { defaultElements } from "@/lib/labels/types";
import { resolveLabelContent } from "@/lib/labels/resolve";
import { buildLabelsPdf } from "@/lib/labels/pdf";
import { PDFDocument } from "pdf-lib";
import { describeStockChange } from "@/lib/inventory/change";
import { webhookDecision } from "@/lib/webhooks/decision";

describe("label dimensions", () => {
  it("converts one inch exactly", () => {
    expect(mmToPt(25.4)).toBeCloseTo(72);
    expect(mmToTwips(25.4)).toBe(1440);
  });

  it("fits the default tag inside a 1/2 by 1 inch label", () => {
    const template = startingTemplate();
    expect(template.widthMm).toBeCloseTo(12.7);
    expect(template.heightMm).toBeCloseTo(25.4);
    for (const element of template.elements) {
      expect(element.x).toBeGreaterThanOrEqual(0);
      expect(element.y).toBeGreaterThanOrEqual(0);
      expect(element.x + element.width).toBeLessThanOrEqual(template.widthMm + 0.01);
      expect(element.y + element.height).toBeLessThanOrEqual(template.heightMm + 0.01);
    }
    const barcode = template.elements.find((element) => element.type === "barcode");
    expect(barcode?.rotation).toBe(90);
    expect(assessBarcode({
      text: "LE-BR-GF-001",
      format: "code128",
      widthMm: barcode?.width ?? 0,
      heightMm: barcode?.height ?? 0,
      rotation: barcode?.rotation,
    }).ok).toBe(false);
  });

  it("blocks a barcode that would be too small to scan", () => {
    const result = assessBarcode({ text: "LE-BR-GF-001", format: "code128", widthMm: 8, heightMm: 3 });
    expect(result.ok).toBe(false);
  });

  it("builds DYMO label XML at the requested size", () => {
    const xml = dymoLabelXml({
      widthMm: 54,
      heightMm: 25,
      orientation: "landscape",
      format: "code128",
      elements: defaultElements(),
      content: resolveLabelContent({
        productName: "14K Gold Filled Permanent Jewelry Bracelet",
        variationName: "Regular",
        displayName: "Gold Filled Bracelet",
        sku: "LE-BR-GF-001",
        barcodeValue: "LE-BR-GF-001",
        showPrice: false,
      }),
    });
    expect(xml).toContain(`Width="${mmToTwips(54)}"`);
    expect(xml).toContain("Gold Filled Bracelet");
    expect(xml).not.toContain("Permanent Jewelry");
    expect(xml).toContain("Code128Auto");
    expect(xml).toContain("LE-BR-GF-001");
  });

  it("creates a PDF page in exact label points", async () => {
    const bytes = await buildLabelsPdf(
      [
        {
          widthMm: 54,
          heightMm: 25,
          format: "code128",
          elements: defaultElements(),
          content: resolveLabelContent({
            productName: "Gold Filled Bracelet",
            variationName: "Regular",
            sku: "LE-BR-GF-001",
            barcodeValue: "LE-BR-GF-001",
            showPrice: true,
            priceAmount: 4800,
          }),
        },
      ],
      { offsetXMm: 0, offsetYMm: 0, scale: 1 },
    );
    const pdf = await PDFDocument.load(bytes);
    const page = pdf.getPage(0);
    expect(page.getWidth()).toBeCloseTo(mmToPt(54), 3);
    expect(page.getHeight()).toBeCloseTo(mmToPt(25), 3);
  });

  it("prints the product name on the jewelry tag with the barcode", async () => {
    const template = startingTemplate();
    const bytes = await buildLabelsPdf(
      [
        {
          widthMm: template.widthMm,
          heightMm: template.heightMm,
          format: "code128",
          elements: template.elements,
          content: resolveLabelContent({
            productName: "14K Gold Filled Permanent Jewelry Bracelet",
            variationName: "Regular",
            displayName: "Gold Filled Bracelet",
            sku: "LE-BR-GF-001",
            barcodeValue: "LE-BR-GF-001",
            showPrice: false,
          }),
        },
      ],
      { offsetXMm: 0, offsetYMm: 0, scale: 1 },
    );
    const text = pdfText(bytes);
    expect(text).toContain("Gold Filled");
    expect(text).toContain("Bracelet");
    expect(text).toContain("LE-BR-GF-001");
    expect(text).not.toContain("Permanent Jewelry");
  });

  it("prints two stickers side by side on one row", async () => {
    const template = startingTemplate();
    const cell = (name: string) => ({
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      format: "code128",
      elements: template.elements,
      content: resolveLabelContent({
        productName: name,
        variationName: "Regular",
        displayName: name,
        sku: "LE1",
        barcodeValue: "LE1",
        showPrice: false,
      }),
    });
    const bytes = await buildLabelsPdf([cell("Gold Bracelet"), cell("Silver Ring")], {
      offsetXMm: 0,
      offsetYMm: 0,
      scale: 1,
      columns: 2,
      columnGapMm: 2,
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getWidth()).toBeCloseTo(mmToPt(rowWidthMm(12.7, 2, 2)), 3);
    expect(pdf.getPage(0).getHeight()).toBeCloseTo(mmToPt(25.4), 3);
    const text = pdfText(bytes);
    expect(text).toContain("Gold");
    expect(text).toContain("Silver");
  });
});

function pdfText(bytes: Uint8Array) {
  const buf = Buffer.from(bytes);
  const chunks: string[] = [];
  let start = 0;
  while (true) {
    const marker = buf.indexOf(Buffer.from("stream"), start);
    if (marker < 0) break;
    let dataStart = marker + 6;
    if (buf[dataStart] === 0x0d) dataStart += 1;
    if (buf[dataStart] === 0x0a) dataStart += 1;
    const end = buf.indexOf(Buffer.from("endstream"), dataStart);
    if (end < 0) break;
    const data = buf.subarray(dataStart, buf[end - 1] === 0x0a ? end - 1 : end);
    try {
      const inflated = inflateSync(data).toString("latin1");
      chunks.push(inflated);
      for (const match of inflated.matchAll(/<([0-9A-Fa-f]+)>/g)) {
        chunks.push(Buffer.from(match[1], "hex").toString("latin1"));
      }
    } catch {
      chunks.push("");
    }
    start = end + 9;
  }
  return chunks.join("\n");
}

describe("inventory writes and webhooks", () => {
  it("maps restocks, damage, and counts onto Square inventory operations", () => {
    expect(describeStockChange("restock", "12")).toMatchObject({ type: "ADJUSTMENT", fromState: "NONE", toState: "IN_STOCK" });
    expect(describeStockChange("damage", "1")).toMatchObject({ toState: "WASTE" });
    expect(describeStockChange("count", "8").type).toBe("PHYSICAL_COUNT");
  });

  it("treats a repeated webhook event as a duplicate", () => {
    expect(webhookDecision(false, false)).toBe("reject");
    expect(webhookDecision(true, true)).toBe("duplicate");
    expect(webhookDecision(true, false)).toBe("process");
  });
});
