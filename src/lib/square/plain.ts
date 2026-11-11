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

export function cloneForWrite(value: unknown): any {
  const plain = toPlain(value);
  reviveMoney(plain);
  return plain;
}

function reviveMoney(value: any) {
  if (!value || typeof value !== "object") return;
  if (value.version != null && value.version !== "") value.version = BigInt(value.version);
  if (value.amount != null && value.currency) value.amount = BigInt(value.amount);
  for (const nested of Object.values(value)) {
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
