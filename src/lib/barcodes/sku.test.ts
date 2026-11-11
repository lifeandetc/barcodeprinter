import { describe, expect, it } from "vitest";
import { normalizeSku, skuCollision, suggestSku } from "@/lib/barcodes/sku";
import { keepExistingBarcode, selectBarcodeValue } from "@/lib/barcodes/select";
import { isValidGtin } from "@/lib/barcodes/gtin";

describe("sku and barcode identity", () => {
  it("skips SKUs that already exist", () => {
    const sku = suggestSku({ itemName: "Gold Filled Bracelet", material: "gold filled" }, ["LE-BR-GF-001"]);
    expect(sku).toBe("LE-BR-GF-002");
  });

  it("rejects a colliding manual SKU", () => {
    const collision = skuCollision("le-br-gf-001", [
      { id: "a", sku: "LE-BR-GF-001" },
      { id: "b", sku: "LE-NK-GF-001" },
    ], "b");
    expect(collision?.id).toBe("a");
    expect(normalizeSku("le-br-gf-010")).toBe("LE-BR-GF-010");
  });

  it("keeps a barcode when the title or price changes", () => {
    expect(keepExistingBarcode("LE-BR-GF-001", false)).toBe(true);
  });

  it("does not copy a SKU into an empty GTIN", () => {
    expect(() => selectBarcodeValue({ sku: "LE-BR-GF-001", gtin: null }, "gtin")).toThrow(/no GTIN/i);
    expect(selectBarcodeValue({ sku: "LE-BR-GF-001", gtin: "012345678905" }, "gtin")).toBe("012345678905");
  });

  it("checks GTIN digits", () => {
    expect(isValidGtin("012345678905")).toBe(true);
    expect(isValidGtin("012345678906")).toBe(false);
  });
});
