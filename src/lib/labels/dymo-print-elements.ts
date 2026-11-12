import { assessBarcodeForDymo } from "@/lib/labels/scan";
import { JEWELRY_30299_BARCODE_MM, isJewelryLabelSize } from "@/lib/labels/jewelry-dymo-layout";
import type { LabelElement } from "@/lib/labels/types";

/** PDF/designer uses 90° barcodes; DYMO jewelry scans with Rotation0 bounds from the 30299 template. */
export function elementsForDymoPrint(
  elements: LabelElement[],
  labelWidthMm = 12.7,
  labelHeightMm = 25.4,
): LabelElement[] {
  const jewelry = isJewelryLabelSize(labelWidthMm, labelHeightMm);
  return elements.map((element) => {
    if (element.type !== "barcode" || !element.visible) return element;
    if (jewelry) {
      return {
        ...element,
        rotation: 0,
        ...JEWELRY_30299_BARCODE_MM,
      };
    }
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
  jewelryTag = false,
): "Small" | "Medium" | "Large" {
  const check = assessBarcodeForDymo({
    text: barcodeValue,
    format,
    widthMm,
    heightMm,
  });
  if (!check.ok) return "Large";
  if (jewelryTag && check.ok) return "Small";
  if (check.moduleMm < 0.28) return "Large";
  if (check.moduleMm < 0.4) return "Medium";
  return "Small";
}
