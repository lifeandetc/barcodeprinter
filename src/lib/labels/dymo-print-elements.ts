import { assessBarcodeForDymo } from "@/lib/labels/scan";
import type { LabelElement } from "@/lib/labels/types";

/** PDF/designer often uses a 90° barcode strip; DYMO Code128 scans reliably when bars run horizontally. */
export function elementsForDymoPrint(elements: LabelElement[], labelWidthMm = 12.7): LabelElement[] {
  const bandWidth = Math.max(8, labelWidthMm - 0.8);
  return elements.map((element) => {
    if (element.type !== "barcode" || !element.visible) return element;
    if (element.rotation === 90 || element.rotation === 270) {
      const height = Math.max(element.width, 6.5);
      return {
        ...element,
        rotation: 0,
        x: Math.max(0.4, (labelWidthMm - bandWidth) / 2),
        y: element.y,
        width: bandWidth,
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
  const check = assessBarcodeForDymo({
    text: barcodeValue,
    format,
    widthMm,
    heightMm,
  });
  if (!check.ok) return "Large";
  if (check.moduleMm < 0.28) return "Large";
  if (check.moduleMm < 0.4) return "Medium";
  return "Small";
}
