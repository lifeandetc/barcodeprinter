const CATEGORY_CODES: [RegExp, string][] = [
  [/bracelet/i, "BR"],
  [/necklace/i, "NK"],
  [/earring/i, "ER"],
  [/hand\s*chain/i, "HC"],
  [/keychain|key chain/i, "KC"],
  [/ring/i, "RG"],
  [/charm/i, "CH"],
];

const MATERIAL_CODES: [RegExp, string][] = [
  [/gold\s*filled|\bgf\b/i, "GF"],
  [/sterling|\b925\b/i, "SS"],
  [/silver/i, "SV"],
  [/rose/i, "RS"],
  [/14k|18k|\bgold\b/i, "GD"],
];

export function categoryCode(name: string) {
  return CATEGORY_CODES.find(([pattern]) => pattern.test(name))?.[1] ?? "OT";
}

export function materialCode(name: string) {
  return MATERIAL_CODES.find(([pattern]) => pattern.test(name))?.[1] ?? "UN";
}

export function buildSku(category: string, material: string, sequence: number) {
  return `LE-${category}-${material}-${String(sequence).padStart(3, "0")}`;
}

export function suggestSku(input: { itemName: string; variationName?: string; material?: string | null }, existing: Iterable<string>) {
  const taken = new Set([...existing].map((sku) => sku.trim().toUpperCase()).filter(Boolean));
  const code = categoryCode(`${input.itemName} ${input.variationName ?? ""}`);
  const material = materialCode(`${input.material ?? ""} ${input.itemName} ${input.variationName ?? ""}`);
  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    const sku = buildSku(code, material, sequence);
    if (!taken.has(sku)) return sku;
  }
  throw new Error("Could not find an unused SKU. Edit one manually.");
}

export function normalizeSku(value: string) {
  const sku = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._+/-]{1,39}$/.test(sku)) {
    throw new Error("Use 2–40 letters, numbers, dots, dashes, or slashes for the SKU.");
  }
  return sku;
}

export function skuCollision(sku: string, rows: { id: string; sku: string | null }[], ignoreId?: string) {
  const target = sku.trim().toUpperCase();
  return rows.find((row) => row.id !== ignoreId && row.sku?.trim().toUpperCase() === target) ?? null;
}
