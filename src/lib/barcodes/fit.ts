import { assessBarcode } from "@/lib/labels/scan";
import { JEWELRY_30299_BARCODE_MM } from "@/lib/labels/jewelry-dymo-layout";
import { isSkuShape } from "@/lib/barcodes/sku";

/** Code 128 along the 1 in side of a jewelry tag. The value is the same code the Barcode Generator shows. */
export function jewelryScanCheck(text: string, format: string) {
  return assessBarcode({
    text,
    format,
    widthMm: JEWELRY_30299_BARCODE_MM.width,
    heightMm: JEWELRY_30299_BARCODE_MM.height,
    rotation: 90,
    quietMm: 1,
    minModuleMm: 0.15,
    minAcrossMm: 6,
  });
}

export function suggestScanSku(existing: Iterable<string>) {
  const taken = new Set([...existing].map((sku) => sku.trim().toUpperCase()).filter(Boolean));
  for (let sequence = 1; sequence <= 9999; sequence += 1) {
    const sku = `LE${String(sequence).padStart(4, "0")}`;
    if (!taken.has(sku)) return sku;
  }
  throw new Error("Could not find an unused short SKU.");
}

export function reservedCodes(rows: { sku?: string | null; barcodeValue?: string | null }[]) {
  const taken = new Set<string>();
  for (const row of rows) {
    if (row.sku?.trim()) taken.add(row.sku.trim().toUpperCase());
    if (row.barcodeValue?.trim()) taken.add(row.barcodeValue.trim().toUpperCase());
  }
  return taken;
}

export type BarcodePlanAction = "ready" | "encode-sku" | "encode-gtin" | "replace-sku" | "blocked";

export type BarcodePlan = {
  value: string;
  format: string;
  action: BarcodePlanAction;
  previousSku: string | null;
  reason?: string;
};

type PlanRow = {
  sku?: string | null;
  gtin?: string | null;
  barcodeValue?: string | null;
  barcodeFormat?: string | null;
};

function same(left: string | null | undefined, right: string) {
  return Boolean(left?.trim()) && left!.trim() === right;
}

export function planBarcode(row: PlanRow, format: string, reserved: Set<string>): BarcodePlan {
  const sku = row.sku?.trim() ?? "";
  const gtin = row.gtin?.trim() ?? "";
  const current = row.barcodeValue?.trim() ?? "";
  const previousSku = sku || null;

  if (format === "qrcode") {
    return {
      value: "",
      format,
      action: "blocked",
      previousSku,
      reason: "A QR code does not fit on a jewelry tag at a size Square can scan. Use Code 128.",
    };
  }

  if (format === "ean13" || format === "upca") {
    if (!gtin) {
      return {
        value: "",
        format,
        action: "blocked",
        previousSku,
        reason: "This variation has no GTIN. One was not created.",
      };
    }
    const scan = jewelryScanCheck(gtin, format);
    if (!scan.ok) {
      return {
        value: gtin,
        format,
        action: "blocked",
        previousSku,
        reason: scan.reason ?? "That GTIN will not scan on a jewelry tag.",
      };
    }
    const saved = current === gtin && (row.barcodeFormat ?? format) === format;
    return {
      value: gtin,
      format,
      action: saved ? "ready" : "encode-gtin",
      previousSku,
      reason: saved ? undefined : "The bars encode the Square GTIN.",
    };
  }

  const printableFormat = format === "code39" && sku && jewelryScanCheck(sku, "code39").ok ? "code39" : "code128";
  if (sku && jewelryScanCheck(sku, printableFormat).ok) {
    const saved = current === sku && (row.barcodeFormat ?? printableFormat) === printableFormat;
    const switched = format === "code39" && printableFormat === "code128";
    return {
      value: sku,
      format: printableFormat,
      action: saved ? "ready" : "encode-sku",
      previousSku,
      reason: saved
        ? undefined
        : switched
          ? "Code 39 is too wide for a jewelry tag. The bars are Code 128 of this Square SKU."
          : "The bars encode this Square SKU.",
    };
  }

  if (current && isSkuShape(current) && jewelryScanCheck(current, "code128").ok && !same(sku, current)) {
    return {
      value: current.toUpperCase(),
      format: "code128",
      action: "replace-sku",
      previousSku,
      reason: sku
        ? `Square SKU ${sku} will not scan on a jewelry tag. Square will use ${current.toUpperCase()} instead, which is the code already on this variation.`
        : `Square has no SKU yet. It will be set to ${current.toUpperCase()} so a scan finds this product.`,
    };
  }

  const next = suggestScanSku(reserved);
  reserved.add(next);
  return {
    value: next,
    format: "code128",
    action: "replace-sku",
    previousSku,
    reason: sku
      ? `Square SKU ${sku} is too long to scan on a jewelry tag. Square will use ${next} so a scan finds this product.`
      : `This variation has no SKU. Square will use ${next} so a scan finds this product.`,
  };
}
