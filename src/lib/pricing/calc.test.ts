import { describe, expect, it } from "vitest";
import { applyPriceChange, previewPlan, SAVED_PLAN_NOTE } from "@/lib/pricing/calc";

describe("price changes", () => {
  it("increases a necklace price by 10 percent", () => {
    expect(applyPriceChange(6800, { mode: "percent", amount: 10 }, "none")).toBe(7480);
  });

  it("applies a fixed dollar change and charm rounding", () => {
    expect(applyPriceChange(4800, { mode: "fixed", amount: -5 }, "charm_99")).toBe(4299);
  });

  it("does not publish a saved plan by itself", () => {
    const variations = [
      { id: "1", itemName: "Necklace", variationName: "Regular", categoryName: "Necklaces", priceAmount: 6800, currency: "USD" },
      { id: "2", itemName: "Bracelet", variationName: "Regular", categoryName: "Bracelets", priceAmount: 4800, currency: "USD" },
    ];
    const proposal = previewPlan(variations, [{ mode: "percent", amount: 10, categoryName: "Necklaces", round: "none" }]);
    expect(proposal).toHaveLength(1);
    expect(proposal[0]?.newAmount).toBe(7480);
    expect(variations[0]?.priceAmount).toBe(6800);
    expect(SAVED_PLAN_NOTE).toMatch(/do not change Square/i);
  });
});
