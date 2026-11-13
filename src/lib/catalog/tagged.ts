export function isTagged(input: { labelsPrinted: number; taggedAt?: string | null; lastPrintedAt?: string | null }) {
  if (input.labelsPrinted < 1 || !input.taggedAt) return false;
  if (!input.lastPrintedAt) return true;
  return input.taggedAt >= input.lastPrintedAt;
}
