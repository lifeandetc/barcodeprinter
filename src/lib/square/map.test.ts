import { describe, expect, it } from "vitest";
import { imageUrlFor, mapCatalogObjects, mapCount, mapLocation } from "@/lib/square/map";
import { assertSingleSource, findDuplicateSkus, shouldApplyRemote } from "@/lib/square/merge";

const item = {
  type: "ITEM",
  id: "ITEM1",
  version: 20n,
  updatedAt: "2026-11-01T15:00:00Z",
  itemData: {
    name: "14K Gold Filled Permanent Jewelry Bracelet",
    description: "Chain bracelet",
    categories: [{ id: "CAT1" }],
    imageIds: ["IMG1"],
    variations: [
      {
        type: "ITEM_VARIATION",
        id: "VAR1",
        version: 20n,
        updatedAt: "2026-11-01T15:00:00Z",
        itemVariationData: {
          itemId: "ITEM1",
          name: "Regular",
          sku: "LE-BR-GF-001",
          upc: "012345678905",
          pricingType: "FIXED_PRICING",
          priceMoney: { amount: 4800n, currency: "USD" },
          trackInventory: true,
          sellable: true,
        },
      },
    ],
  },
};

describe("Square catalog mapping", () => {
  it("keeps the variation id, SKU, GTIN, and price distinct", () => {
    const mapped = mapCatalogObjects([
      item,
      { type: "CATEGORY", id: "CAT1", version: 4, categoryData: { name: "Bracelets" } },
      { type: "IMAGE", id: "IMG1", imageData: { url: "https://example.com/bracelet.jpg" } },
    ]);
    const variation = mapped.items[0]?.variations[0];
    expect(variation?.id).toBe("VAR1");
    expect(variation?.sku).toBe("LE-BR-GF-001");
    expect(variation?.gtin).toBe("012345678905");
    expect(variation?.priceAmount).toBe(4800);
    expect(mapped.items[0]?.name).toContain("Permanent Jewelry");
    expect(imageUrlFor(mapped.items[0]!, mapped.images)).toBe("https://example.com/bracelet.jpg");
    expect(mapped.categories[0]?.name).toBe("Bracelets");
  });

  it("reads snake_case catalog payloads", () => {
    const mapped = mapCatalogObjects([
      {
        type: "ITEM",
        id: "ITEM2",
        version: "5",
        updated_at: "2026-10-01T00:00:00Z",
        item_data: {
          name: "Keychain",
          variations: [
            {
              type: "ITEM_VARIATION",
              id: "VAR2",
              version: "5",
              item_variation_data: {
                item_id: "ITEM2",
                name: "Brass",
                sku: "LE-KC-UN-001",
                price_money: { amount: "1800", currency: "USD" },
                track_inventory: false,
              },
            },
          ],
        },
      },
    ]);
    expect(mapped.items[0]?.variations[0]?.priceAmount).toBe(1800);
    expect(mapped.items[0]?.variations[0]?.gtin).toBeNull();
  });

  it("maps locations and inventory counts", () => {
    expect(mapLocation({ id: "LOC1", name: "Studio", status: "ACTIVE", currency: "USD" })?.name).toBe("Studio");
    expect(mapCount({ catalog_object_id: "VAR1", location_id: "LOC1", quantity: "12", state: "IN_STOCK" })).toMatchObject({
      variationId: "VAR1",
      quantity: "12",
    });
  });
});

describe("sync conflicts", () => {
  it("does not replace a newer local Square version with an older payload", () => {
    expect(shouldApplyRemote("20", "19")).toBe("skip-older");
    expect(shouldApplyRemote("19", "20")).toBe("apply");
    expect(shouldApplyRemote(null, "20")).toBe("apply");
  });

  it("reports duplicate SKUs and refuses mixed demo data", () => {
    expect(findDuplicateSkus([
      { id: "a", sku: "LE-BR-GF-001" },
      { id: "b", sku: "le-br-gf-001" },
    ])).toHaveLength(1);
    expect(() => assertSingleSource(["demo", "square"])).toThrow(/cannot be stored together/i);
  });
});
