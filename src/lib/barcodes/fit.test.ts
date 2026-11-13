import { describe, expect, it } from "vitest";
import { planBarcode, reservedCodes, suggestScanSku } from "@/lib/barcodes/fit";

describe("jewelry barcode plans", () => {
  it("keeps a short SKU that is already saved", () => {
    const reserved = reservedCodes([{ sku: "1001", barcodeValue: "1001" }]);
    const plan = planBarcode(
      { sku: "1001", gtin: null, barcodeValue: "1001", barcodeFormat: "code128" },
      "code128",
      reserved,
    );
    expect(plan).toMatchObject({ action: "ready", value: "1001", format: "code128" });
  });

  it("replaces an LE code with the 4-digit code that fits on a jewelry tag", () => {
    const reserved = reservedCodes([{ sku: "LE0007", barcodeValue: "LE0007" }]);
    const plan = planBarcode(
      { sku: "LE0007", gtin: null, barcodeValue: "LE0007", barcodeFormat: "code128" },
      "code128",
      reserved,
    );
    expect(plan).toMatchObject({ action: "replace-sku", value: "1007", previousSku: "LE0007" });
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
    expect(first.value).toMatch(/^\d{4}$/);
    expect(second.value).toMatch(/^\d{4}$/);
    expect(first.value).not.toBe(second.value);
    expect(first.previousSku).toBe("LE-BR-GF-001");
  });

  it("does not reuse a SKU that already exists", () => {
    expect(suggestScanSku(["1001", "1002"])).toBe("1003");
  });

  it("does not invent a GTIN", () => {
    const plan = planBarcode({ sku: "LE0001", gtin: null, barcodeValue: null }, "ean13", new Set(["LE0001"]));
    expect(plan.action).toBe("blocked");
    expect(plan.reason).toMatch(/no GTIN/i);
  });
});
