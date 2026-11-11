export type StockReason = "restock" | "damage" | "increase" | "decrease" | "count";

export function describeStockChange(reason: StockReason, quantity: string) {
  if (Number(quantity) <= 0 && reason !== "count") {
    throw new Error("Enter a quantity greater than zero.");
  }
  if (reason === "count") {
    return {
      type: "PHYSICAL_COUNT" as const,
      quantity,
      fromState: null,
      toState: "IN_STOCK",
      label: "Physical count",
    };
  }
  if (reason === "damage") {
    return {
      type: "ADJUSTMENT" as const,
      quantity,
      fromState: "IN_STOCK",
      toState: "WASTE",
      label: "Damaged merchandise",
    };
  }
  if (reason === "decrease") {
    return {
      type: "ADJUSTMENT" as const,
      quantity,
      fromState: "IN_STOCK",
      toState: "NONE",
      label: "Stock decrease",
    };
  }
  return {
    type: "ADJUSTMENT" as const,
    quantity,
    fromState: "NONE",
    toState: "IN_STOCK",
    label: reason === "restock" ? "Restock" : "Stock increase",
  };
}
