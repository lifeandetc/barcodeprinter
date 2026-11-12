import { describe, expect, it } from "vitest";
import {
  applyCategoryFocus,
  categoryNameMatches,
  resolveCategoryFocusNames,
  type CategoryFocus,
} from "@/lib/catalog/category-focus";

describe("category focus", () => {
  const rows = [
    { id: "1", categoryName: "Christmas Market" },
    { id: "2", categoryName: "Necklaces" },
    { id: "3", categoryName: null },
  ];

  it("filters to selected categories", () => {
    const focus: CategoryFocus = { enabled: true, names: ["Christmas Market"] };
    expect(applyCategoryFocus(rows, focus).map((row) => row.id)).toEqual(["1"]);
  });

  it("matches case-insensitively", () => {
    const focus: CategoryFocus = { enabled: true, names: ["christmas market"] };
    expect(applyCategoryFocus(rows, focus).map((row) => row.id)).toEqual(["1"]);
    expect(categoryNameMatches("CHRISTMAS MARKET", "Christmas Market")).toBe(true);
  });

  it("returns the full catalog when focus is off", () => {
    const focus: CategoryFocus = { enabled: false, names: ["Christmas Market"] };
    expect(applyCategoryFocus(rows, focus)).toHaveLength(3);
  });

  it("resolves save names to catalog spellings", () => {
    expect(resolveCategoryFocusNames(["christmas market", "Necklaces"], ["Christmas Market", "Necklaces"])).toEqual([
      "Christmas Market",
      "Necklaces",
    ]);
  });

  it("keeps unknown names when catalog list is empty", () => {
    expect(resolveCategoryFocusNames(["Christmas Market"], [])).toEqual(["Christmas Market"]);
  });
});
