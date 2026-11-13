import { assessBarcode } from "@/lib/labels/scan";
import { JEWELRY_30299_BARCODE_MM } from "@/lib/labels/jewelry-dymo-layout";
import { isSkuShape } from "@/lib/barcodes/sku";

/**
 * Square scanners need bars about 0.25 mm wide. A 6-character code cannot be that wide on a 1 in tag.
 * LE0007 becomes 1007. 40P566 stays one shared code, 9566, so Square still asks which finish.
 */
export function jewelryScanCode(value: string) {
  const text = value.trim().toUpperCase();
  const le = /^LE(\d{4})$/.exec(text);
  if (le) {
    const n = Number(le[1]);
    if (n >= 1 && n <= 8999) return String(1000 + n);
  }
  if (text === "40P566") return "9566";
  return text;
}

/** Code 128 along the 1 in side. The bars have to be at least 0.25 mm or Square will not read them. */
export function jewelryScanCheck(text: string, format: string) {
  return assessBarcode({
    text,
    format,
    widthMm: Math.max(JEWELRY_30299_BARCODE_MM.width, 8),
    heightMm: 25.4,
    rotation: 90,
    quietMm: 4,
    minModuleMm: 0.25,
    minAcrossMm: 6,
  });
}

export function suggestScanSku(existing: Iterable<string>) {
  const taken = new Set([...existing].map((sku) => sku.trim().toUpperCase()).filter(Boolean));
  for (let sequence = 1001; sequence <= 9999; sequence += 1) {
    const sku = String(sequence);
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

  const mapped = sku ? jewelryScanCode(sku) : "";
  if (mapped && mapped !== sku.toUpperCase() && jewelryScanCheck(mapped, "code128").ok) {
    const saved = current === mapped && (row.barcodeFormat ?? "code128") === "code128";
    return {
      value: mapped,
      format: "code128",
      action: saved ? "ready" : "replace-sku",
      previousSku,
      reason: saved ? undefined : `Square SKU ${sku} is too long for a jewelry tag. Square will use ${mapped} so a scan finds this product.`,
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
