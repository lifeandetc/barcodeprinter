export function isValidGtin(value: string) {
  const digits = value.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return false;
  const check = Number(digits.at(-1));
  const body = digits.slice(0, -1).split("").reverse();
  const sum = body.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function gtinKind(value: string | null | undefined): "ean13" | "upca" | "ean8" | null {
  if (!value || !isValidGtin(value)) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13) return "ean13";
  if (digits.length === 12) return "upca";
  if (digits.length === 8) return "ean8";
  return null;
}
