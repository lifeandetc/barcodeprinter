export type RoundRule = "none" | "nearest_50" | "nearest_100" | "charm_99";
export type PriceMode = "percent" | "fixed";

export type PriceRule = {
  mode: PriceMode;
  amount: number;
  categoryName?: string | null;
  round: RoundRule;
};

export type PriceSubject = {
  id: string;
  itemName: string;
  variationName: string;
  categoryName: string | null;
  priceAmount: number | null;
  currency: string;
};

export type PriceProposal = {
  variationId: string;
  itemName: string;
  variationName: string;
  categoryName: string | null;
  currency: string;
  oldAmount: number;
  newAmount: number;
};

export function applyPriceChange(cents: number, change: { mode: PriceMode; amount: number }, round: RoundRule) {
  const next = change.mode === "percent" ? Math.round(cents * (1 + change.amount / 100)) : cents + Math.round(change.amount * 100);
  return roundCents(Math.max(0, next), round);
}

export function roundCents(cents: number, round: RoundRule) {
  if (round === "nearest_50") return Math.round(cents / 50) * 50;
  if (round === "nearest_100") return Math.round(cents / 100) * 100;
  if (round === "charm_99") {
    const dollars = Math.max(1, Math.round(cents / 100));
    return dollars * 100 - 1;
  }
  return cents;
}

export function previewPlan(variations: PriceSubject[], rules: PriceRule[]): PriceProposal[] {
  const amounts = new Map(variations.filter((row) => row.priceAmount != null).map((row) => [row.id, row.priceAmount as number]));
  const touched = new Set<string>();
  for (const rule of rules) {
    for (const variation of variations) {
      if (variation.priceAmount == null) continue;
      if (rule.categoryName && variation.categoryName !== rule.categoryName) continue;
      const current = amounts.get(variation.id) ?? variation.priceAmount;
      amounts.set(variation.id, applyPriceChange(current, rule, rule.round));
      touched.add(variation.id);
    }
  }
  return variations
    .filter((variation) => touched.has(variation.id) && variation.priceAmount != null)
    .map((variation) => ({
      variationId: variation.id,
      itemName: variation.itemName,
      variationName: variation.variationName,
      categoryName: variation.categoryName,
      currency: variation.currency,
      oldAmount: variation.priceAmount as number,
      newAmount: amounts.get(variation.id) as number,
    }));
}

export const SAVED_PLAN_NOTE =
  "Saved plans do not change Square. Publish a preview when you want the new prices to go live.";
