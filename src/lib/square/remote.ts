import { createHmac, timingSafeEqual } from "node:crypto";
import { field } from "@/lib/square/plain";
import { withBackoff } from "@/lib/square/backoff";
import { squareClient } from "@/lib/square/client";

function client() {
  const square = squareClient();
  if (!square) throw new Error("Square is not configured. Add SQUARE_ACCESS_TOKEN on the server.");
  return square;
}

export async function listCatalogObjects() {
  const page = await withBackoff(() => client().catalog.list({ types: "ITEM,ITEM_VARIATION,CATEGORY,IMAGE,ITEM_OPTION" }));
  const objects: unknown[] = [];
  for await (const entry of page) {
    const nested = field<unknown[]>(entry, "objects", "objects");
    if (Array.isArray(nested)) objects.push(...nested);
    else objects.push(entry);
  }
  return objects;
}

export async function listSquareLocations() {
  const response = await withBackoff(() => client().locations.list());
  const locations = (response as { locations?: unknown[] }).locations;
  return Array.isArray(locations) ? locations : [];
}

export async function listInventoryCounts(variationIds: string[]) {
  if (!variationIds.length) return [];
  const page = await withBackoff(() =>
    client().inventory.batchGetCounts({
      catalogObjectIds: variationIds,
    }),
  );
  const counts: unknown[] = [];
  for await (const entry of page) counts.push(entry);
  return counts;
}

export async function retrieveCatalogItems(ids: string[]) {
  if (!ids.length) return [];
  const response = await withBackoff(() =>
    client().catalog.batchGet({
      objectIds: ids,
      includeRelatedObjects: true,
    }),
  );
  const objects = (response as { objects?: unknown[] }).objects ?? [];
  const related = (response as { relatedObjects?: unknown[] }).relatedObjects ?? [];
  return [...objects, ...related];
}

export async function upsertCatalogObjects(objects: unknown[], idempotencyKey: string) {
  const response = await withBackoff(() =>
    client().catalog.batchUpsert({
      idempotencyKey,
      batches: [{ objects: objects as never[] }],
    }),
  );
  const errors = (response as { errors?: { detail?: string }[] }).errors ?? [];
  const written = (response as { objects?: unknown[] }).objects ?? [];
  const idMappings = (response as { idMappings?: { clientObjectId?: string; objectId?: string }[] }).idMappings ?? [];
  if (errors.length && written.length === 0) {
    throw new Error(errors.map((error) => error.detail).filter(Boolean).join(" ") || "Square rejected the catalog update.");
  }
  return { objects: written, idMappings, errors };
}

export async function createInventoryChange(body: {
  idempotencyKey: string;
  type: "ADJUSTMENT" | "PHYSICAL_COUNT";
  variationId: string;
  locationId: string;
  quantity: string;
  fromState: string | null;
  toState: string;
}) {
  const occurredAt = new Date().toISOString();
  const changes =
    body.type === "PHYSICAL_COUNT"
      ? [
          {
            type: "PHYSICAL_COUNT" as const,
            physicalCount: {
              catalogObjectId: body.variationId,
              state: "IN_STOCK" as const,
              locationId: body.locationId,
              quantity: body.quantity,
              occurredAt,
            },
          },
        ]
      : [
          {
            type: "ADJUSTMENT" as const,
            adjustment: {
              catalogObjectId: body.variationId,
              fromState: body.fromState as "NONE" | "IN_STOCK",
              toState: body.toState as "IN_STOCK" | "WASTE" | "NONE",
              quantity: body.quantity,
              fromLocationId: body.locationId,
              toLocationId: body.locationId,
              occurredAt,
            },
          },
        ];
  return withBackoff(() =>
    client().inventory.batchCreateChanges({
      idempotencyKey: body.idempotencyKey,
      changes,
    }),
  );
}

export async function verifySquareWebhook(input: {
  requestBody: string;
  signatureHeader: string;
  signatureKey: string;
  notificationUrl: string;
}) {
  const square = await import("square");
  const helper = (square as { WebhooksHelper?: { verifySignature: (value: typeof input) => Promise<boolean> | boolean } }).WebhooksHelper;
  if (helper?.verifySignature) {
    return Boolean(await helper.verifySignature(input));
  }
  const digest = createHmac("sha256", input.signatureKey).update(input.notificationUrl + input.requestBody).digest();
  const received = Buffer.from(input.signatureHeader, "base64");
  if (digest.length !== received.length) return false;
  return timingSafeEqual(digest, received);
}
