import { describe, expect, it } from "vitest";
import { planBarcode, reservedCodes, suggestScanSku } from "@/lib/barcodes/fit";

describe("jewelry barcode plans", () => {
  it("keeps a short SKU that is already saved", () => {
    const reserved = reservedCodes([{ sku: "LE0001", barcodeValue: "LE0001" }]);
    const plan = planBarcode(
      { sku: "LE0001", gtin: null, barcodeValue: "LE0001", barcodeFormat: "code128" },
      "code128",
      reserved,
    );
    expect(plan).toMatchObject({ action: "ready", value: "LE0001", format: "code128" });
  });

  it("draws a preview for a short Square SKU that is not saved yet", () => {
    const reserved = reservedCodes([{ sku: "LE0007", barcodeValue: null }]);
    const plan = planBarcode({ sku: "LE0007", gtin: null, barcodeValue: null }, "code128", reserved);
    expect(plan).toMatchObject({ action: "encode-sku", value: "LE0007" });
  });

  it("replaces a long SKU with a short code Square can match", () => {
    const reserved = reservedCodes([
      { sku: "LE-BR-GF-001", barcodeValue: "LE-BR-GF-001" },
      { sku: "LE-NK-GF-001", barcodeValue: null },
    ]);
    const first = planBarcode(
      { sku: "LE-BR-GF-001", gtin: null, barcodeValue: "LE-BR-GF-001", barcodeFormat: "code128" },
      "code128",
      reserved,
    );
    const second = planBarcode({ sku: "LE-NK-GF-001", gtin: null, barcodeValue: null }, "code128", reserved);
    expect(first.action).toBe("replace-sku");
    expect(second.action).toBe("replace-sku");
    expect(first.value).toMatch(/^LE\d{4}$/);
    expect(second.value).toMatch(/^LE\d{4}$/);
    expect(first.value).not.toBe(second.value);
    expect(first.previousSku).toBe("LE-BR-GF-001");
  });

  it("does not reuse a SKU that already exists", () => {
    expect(suggestScanSku(["LE0001", "le0002"])).toBe("LE0003");
  });

  it("gives each color its own code when they share a SKU", () => {
    const rows = [
      { id: "gold", sku: "HOOP", barcodeValue: "HOOP" },
      { id: "silver", sku: "HOOP", barcodeValue: "HOOP" },
    ];
    const reserved = reservedCodes(rows);
    const shared = new Set(rows.map((row) => row.id));
    const gold = planBarcode(rows[0], "code128", reserved, { skuShared: shared.has("gold"), barcodeShared: true });
    const silver = planBarcode(rows[1], "code128", reserved, { skuShared: shared.has("silver"), barcodeShared: true });
    expect(gold.action).toBe("replace-sku");
    expect(silver.action).toBe("replace-sku");
    expect(gold.value).not.toBe(silver.value);
    expect(gold.value).not.toBe("HOOP");
    expect(gold.reason).toMatch(/color/i);
  });

  it("does not invent a GTIN", () => {
    const plan = planBarcode({ sku: "LE0001", gtin: null, barcodeValue: null }, "ean13", new Set(["LE0001"]));
    expect(plan.action).toBe("blocked");
    expect(plan.reason).toMatch(/no GTIN/i);
  });
});
