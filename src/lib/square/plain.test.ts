import { describe, expect, it } from "vitest";
import { cloneForWrite, safeBigInt, sanitizeCatalogItemForWrite } from "@/lib/square/plain";

describe("safeBigInt", () => {
  it("accepts digit strings", () => {
    expect(safeBigInt("9223372036854775807")).toBe(9223372036854775807n);
  });

  it("rejects non-integer values", () => {
    expect(safeBigInt(12.5)).toBeNull();
  });
});

describe("cloneForWrite", () => {
  it("restores version and strips ordinals from catalog writes", () => {
    const copy = cloneForWrite({
      type: "ITEM",
      version: 3n,
      itemData: {
        categories: [{ id: "abc", ordinal: 2n }],
        reportingCategory: { id: "abc", ordinal: 1n },
      },
    });
    expect(copy.version).toBe(3n);
    expect(copy.itemData.categories[0].ordinal).toBeUndefined();
    expect(copy.itemData.reportingCategory.ordinal).toBeUndefined();
  });

  it("drops corrupt ordinal numbers from JSON round-trip", () => {
    const copy = cloneForWrite({
      itemData: {
        categories: [{ id: "abc", ordinal: -2251799780130816 }],
        reportingCategory: { id: "abc", ordinal: -2251799780130816 },
      },
    });
    expect(copy.itemData.categories[0].ordinal).toBeUndefined();
    expect(copy.itemData.reportingCategory.ordinal).toBeUndefined();
  });
});

describe("sanitizeCatalogItemForWrite", () => {
  it("keeps only category ids", () => {
    const copy = {
      itemData: {
        categories: [{ id: "cat-1", ordinal: 9n }],
        reportingCategory: { id: "cat-1", ordinal: 8n },
      },
    };
    sanitizeCatalogItemForWrite(copy);
    expect(copy.itemData.categories).toEqual([{ id: "cat-1" }]);
    expect(copy.itemData.reportingCategory).toEqual({ id: "cat-1" });
  });
});
