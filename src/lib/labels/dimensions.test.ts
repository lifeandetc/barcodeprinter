import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { assessBarcode, assessBarcodeForDymo } from "@/lib/labels/scan";
import { mmToPt, mmToTwips, startingTemplate } from "@/lib/labels/types";
import { dymoLabelXml, fixDymoConnectLabelXml, rowWidthMm } from "@/lib/labels/dymo-xml";
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

  it("accepts a short jewelry code and rejects a long SKU", async () => {
    const { jewelryScanCheck } = await import("@/lib/barcodes/fit");
    expect(jewelryScanCheck("LE0001", "code128").ok).toBe(true);
    expect(jewelryScanCheck("LE-BR-GF-001", "code128").ok).toBe(false);
    const { JEWELRY_30299_BARCODE_MM } = await import("@/lib/labels/jewelry-dymo-layout");
    const turned = assessBarcodeForDymo({
      text: "LE0001",
      format: "code128",
      widthMm: JEWELRY_30299_BARCODE_MM.width,
      heightMm: JEWELRY_30299_BARCODE_MM.height,
      rotation: 90,
    });
    expect(turned.ok).toBe(true);
  });

  it("draws two die-cut outlines for jewelry two-across rows", async () => {
    const { jewelryRowDrawCommands } = await import("@/lib/labels/jewelry-dymo-layout");
    const draw = jewelryRowDrawCommands(12.7, 25.4, 2, 2);
    expect(draw).toContain('X="0"');
    expect(draw).toContain(`X="${mmToTwips(12.7 + 2)}"`);
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
    expect(xml).not.toMatch(/<(ForeColor|BackColor|Font|TextFont|CheckSumFont)[^>]*\/>/);
    expect(xml).toContain("<ForeColor Alpha=\"255\" Red=\"0\" Green=\"0\" Blue=\"0\"> </ForeColor>");
    expect(xml).toContain("<Font Family=\"Arial\" Size=\"7\" Bold=\"True\" Italic=\"False\" Underline=\"False\" Strikeout=\"False\"> </Font>");
    expect(fixDymoConnectLabelXml('<ForeColor Alpha="1" Red="0" Green="0" Blue="0" />')).toContain(
      "<ForeColor Alpha=\"1\" Red=\"0\" Green=\"0\" Blue=\"0\"> </ForeColor>",
    );
  });

  it("gives each sticker unique DYMO object names in two-across rows", () => {
    const template = startingTemplate();
    const content = resolveLabelContent({
      productName: "A",
      variationName: "Regular",
      displayName: "A",
      sku: "LE1",
      barcodeValue: "LE1",
      showPrice: false,
    });
    const xml = dymoLabelXml({
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      orientation: "portrait",
      columnCount: 2,
      columnGapMm: 2,
      elements: template.elements,
      content,
      format: "code128",
      slots: [
        { elements: template.elements, content, format: "code128" },
        { elements: template.elements, content, format: "code128" },
      ],
    });
    expect(xml).toContain("<Name>barcode_1</Name>");
    expect(xml).toContain("<Name>barcode_2</Name>");
    expect(xml).not.toContain("<Name>barcode</Name>");
    expect(xml).toContain("<Id>Address</Id>");
    expect(xml).toContain("<Rotation>Rotation0</Rotation>");
    expect(xml).toContain("<Rotation>Rotation90</Rotation>");
    expect(xml).toContain("<Size>Large</Size>");
    expect(xml).toContain(`X="${mmToTwips(12.7 + 2)}"`);
    const firstBarcode = xml.indexOf("<Name>barcode_1</Name>");
    const secondBarcode = xml.indexOf("<Name>barcode_2</Name>");
    expect(firstBarcode).toBeGreaterThan(-1);
    expect(secondBarcode).toBeGreaterThan(firstBarcode);
  });

  it("prints the color on the jewelry tag", () => {
    const xml = dymoLabelXml({
      widthMm: 12.7,
      heightMm: 25.4,
      orientation: "portrait",
      format: "code128",
      elements: defaultElements(),
      content: resolveLabelContent({
        productName: "Hoops",
        variationName: "Gold",
        sku: "LE0001",
        barcodeValue: "LE0001",
        showPrice: false,
      }),
    });
    expect(xml).toContain("Hoops · Gold");
    expect(xml).toContain("LE0001");
  });

  it("builds a minimal jewelry print label for DYMO Connect", async () => {
    const { buildJewelryLabelXml } = await import("@/lib/labels/dymo-jewelry-open");
    const xml = buildJewelryLabelXml(
      resolveLabelContent({
        productName: "Chain",
        variationName: "Regular",
        displayName: "Herringbone",
        sku: "LE-1",
        barcodeValue: "LE-1",
        showPrice: false,
      }),
    );
    expect(xml).toContain("<PaperName>30252 Address</PaperName>");
    expect(xml).not.toMatch(/<(Bounds|RoundRectangle)[^>]*\/>/);
  });

  it("runs the jewelry barcode along the long side of the tag", async () => {
    const { elementsForDymoPrint } = await import("@/lib/labels/dymo-print-elements");
    const { JEWELRY_30299_BARCODE_MM } = await import("@/lib/labels/jewelry-dymo-layout");
    const barcode = defaultElements().find((element) => element.type === "barcode")!;
    const adjusted = elementsForDymoPrint([barcode], 12.7, 25.4).find((element) => element.type === "barcode")!;
    expect(adjusted.rotation).toBe(90);
    expect(adjusted.width).toBeCloseTo(JEWELRY_30299_BARCODE_MM.width, 2);
    expect(adjusted.height).toBeCloseTo(JEWELRY_30299_BARCODE_MM.height, 2);
    expect(adjusted.height).toBeGreaterThan(adjusted.width);
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
