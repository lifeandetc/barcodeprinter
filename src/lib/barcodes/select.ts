import { gtinKind, isValidGtin } from "@/lib/barcodes/gtin";

export const BARCODE_FORMATS = [
  {
    id: "code128",
    label: "Code 128",
    note: "Default for a Square SKU. Not guaranteed until your checkout scan succeeds.",
  },
  {
    id: "code39",
    label: "Code 39",
    note: "Letters, numbers, and a few symbols. Untested until you verify a scan.",
  },
  {
    id: "ean13",
    label: "EAN-13",
    note: "Requires a real 13-digit GTIN already on the variation.",
  },
  {
    id: "upca",
    label: "UPC-A",
    note: "Requires a real 12-digit UPC already on the variation.",
  },
  {
    id: "qrcode",
    label: "QR Code",
    note: "Square checkout usually scans linear product codes, not QR. Treat as unverified.",
  },
] as const;

export type BarcodeFormat = (typeof BARCODE_FORMATS)[number]["id"];
export type BarcodeSource = "sku" | "gtin" | "manual";

const CODE39 = /^[0-9A-Z\-. $/+%]+$/;

export function keepExistingBarcode(existing: string | null | undefined, regenerate: boolean) {
  return Boolean(existing) && !regenerate;
}

export function selectBarcodeValue(
  variation: { sku?: string | null; gtin?: string | null },
  source: BarcodeSource,
  manual?: string | null,
) {
  if (source === "manual") {
    const value = manual?.trim();
    if (!value) throw new Error("Enter the value to encode.");
    return value;
  }
  if (source === "gtin") {
    if (!variation.gtin) {
      throw new Error("This variation has no GTIN. One was not created, and the SKU was not copied into the GTIN field.");
    }
    return variation.gtin;
  }
  if (!variation.sku) throw new Error("This variation has no SKU yet.");
  return variation.sku;
}

export function assertFormatAccepts(format: string, value: string) {
  if (!value.trim()) throw new Error("There is no value to encode.");
  if (format === "code39" && !CODE39.test(value.toUpperCase())) {
    throw new Error("Code 39 only supports uppercase letters, numbers, spaces, and - . $ / + %.");
  }
  if (format === "ean13") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 13 || !isValidGtin(digits)) {
      throw new Error("EAN-13 needs a valid 13-digit GTIN. This app will not invent one.");
    }
  }
  if (format === "upca") {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 12 || !isValidGtin(digits)) {
      throw new Error("UPC-A needs a valid 12-digit UPC. This app will not invent one.");
    }
  }
  if ((format === "ean13" || format === "upca") && gtinKind(value) == null) {
    throw new Error("That identifier is not a valid GTIN for this barcode format.");
  }
}

export function resolveEncodedValue(input: {
  existing: string | null | undefined;
  regenerate: boolean;
  source: BarcodeSource;
  format: string;
  sku?: string | null;
  gtin?: string | null;
  manual?: string | null;
}) {
  if (keepExistingBarcode(input.existing, input.regenerate)) return input.existing as string;
  const value = selectBarcodeValue(input, input.source, input.manual);
  assertFormatAccepts(input.format, value);
  return value;
}
