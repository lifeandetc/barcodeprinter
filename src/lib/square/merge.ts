export type RemoteDecision = "apply" | "skip-older" | "missing";

export function shouldApplyRemote(localVersion: string | null | undefined, remoteVersion: string | null | undefined): RemoteDecision {
  if (!remoteVersion) return "missing";
  if (!localVersion) return "apply";
  try {
    return BigInt(remoteVersion) >= BigInt(localVersion) ? "apply" : "skip-older";
  } catch {
    return remoteVersion >= localVersion ? "apply" : "skip-older";
  }
}

export function findDuplicateSkus(rows: { id: string; sku: string | null | undefined }[]) {
  const seen = new Map<string, string[]>();
  for (const row of rows) {
    const sku = row.sku?.trim();
    if (!sku) continue;
    const key = sku.toUpperCase();
    seen.set(key, [...(seen.get(key) ?? []), row.id]);
  }
  return [...seen.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([sku, ids]) => ({ sku, ids }));
}

export function assertSingleSource(sources: string[]) {
  const unique = new Set(sources);
  if (unique.has("demo") && unique.has("square")) {
    throw new Error("Demo and Square records cannot be stored together.");
  }
}
