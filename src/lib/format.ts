export function formatMoney(cents: number | null | undefined, currency = "USD") {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(cents / 100);
}

export function formatQty(value: string | number | null | undefined) {
  if (value == null || value === "") return "—";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return String(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function sumQuantities(values: string[]) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

export function formatWhen(value: string | Date | null | undefined) {
  if (!value) return "Not yet";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function dollarsToCents(value: string) {
  const trimmed = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Error("Enter a price like 48.00.");
  const [dollars, fraction = ""] = trimmed.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export function parseQuantity(value: string) {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error("Enter a quantity as a positive number.");
  }
  if (Number(trimmed) < 0) throw new Error("Quantity cannot be negative.");
  return trimmed;
}
