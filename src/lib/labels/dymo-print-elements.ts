import { assessBarcode } from "@/lib/labels/scan";
import type { LabelElement } from "@/lib/labels/types";

/** PDF/designer often uses a 90° barcode strip; DYMO Code128 scans reliably when bars run horizontally. */
export function elementsForDymoPrint(elements: LabelElement[]): LabelElement[] {
  return elements.map((element) => {
    if (element.type !== "barcode" || !element.visible) return element;
    if (element.rotation === 90 || element.rotation === 270) {
      const width = element.height;
      const height = element.width;
      return {
        ...element,
        rotation: 0,
        x: Math.max(0.4, element.x + (element.width - width) / 2),
        y: element.y,
        width,
        height,
      };
    }
    if (element.rotation !== 0) {
      return { ...element, rotation: 0 };
    }
    return element;
  });
}

export function dymoBarcodeSize(
  format: string,
  barcodeValue: string,
  widthMm: number,
  heightMm: number,
): "Small" | "Medium" | "Large" {
  const check = assessBarcode({
    text: barcodeValue,
    format,
    widthMm,
    heightMm,
    rotation: 0,
  });
  if (!check.ok) return "Large";
  if (check.moduleMm < 0.28) return "Large";
  if (check.moduleMm < 0.4) return "Medium";
  return "Small";
}
