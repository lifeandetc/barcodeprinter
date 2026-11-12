export function toPlain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, nested) => (typeof nested === "bigint" ? nested.toString() : nested)),
  ) as T;
}

export function asVersion(value: unknown) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

export function asCents(value: unknown) {
  if (value == null || value === "") return null;
  const number = typeof value === "bigint" ? Number(value) : Number(value);
  if (!Number.isSafeInteger(number)) return null;
  return number;
}

export function asString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

const BIGINT_KEYS = new Set(["version", "ordinal", "amount"]);

export function safeBigInt(value: unknown): bigint | null {
  if (value == null || value === "") return null;
  if (typeof value === "bigint") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return BigInt(value.trim());
  if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
  return null;
}

export function cloneForWrite(value: unknown): any {
  const plain = toPlain(value);
  reviveMoney(plain);
  return plain;
}

/** Drop category ordinals Square may have returned as unsafe numbers; id-only references are enough for updates. */
export function sanitizeCatalogItemForWrite(copy: Record<string, unknown>) {
  const data = (copy.itemData ?? copy.item_data) as Record<string, unknown> | undefined;
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data.categories)) {
    data.categories = data.categories
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const id = (entry as { id?: string }).id;
        return id ? { id } : null;
      })
      .filter(Boolean);
  }
  const reporting = (data.reportingCategory ?? data.reporting_category) as { id?: string } | undefined;
  if (reporting?.id) {
    const minimal = { id: reporting.id };
    if (data.reportingCategory) data.reportingCategory = minimal;
    else data.reporting_category = minimal;
  }
}

function reviveMoney(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(reviveMoney);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if (key === "ordinal") {
      delete record[key];
      continue;
    }
    if (BIGINT_KEYS.has(key)) {
      const revived = safeBigInt(nested);
      if (revived != null) record[key] = revived;
      else delete record[key];
      continue;
    }
    if (Array.isArray(nested)) nested.forEach(reviveMoney);
    else if (nested && typeof nested === "object") reviveMoney(nested);
  }
}

export function field<T = unknown>(record: unknown, camel: string, snake: string): T | undefined {
  if (!record || typeof record !== "object") return undefined;
  const object = record as Record<string, T | undefined>;
  if (object[camel] !== undefined) return object[camel];
  return object[snake];
}
