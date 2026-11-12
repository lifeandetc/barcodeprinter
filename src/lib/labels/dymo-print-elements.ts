import { assessBarcodeForDymo } from "@/lib/labels/scan";
import {
  JEWELRY_30299_BARCODE_MM,
  JEWELRY_DYMO_FIELDS_MM,
  isJewelryLabelSize,
} from "@/lib/labels/jewelry-dymo-layout";
import type { LabelElement } from "@/lib/labels/types";

/** Map designer fields onto DYMO’s jewelry label geometry (Rotation0, scannable barcode). */
export function elementsForDymoPrint(
  elements: LabelElement[],
  labelWidthMm = 12.7,
  labelHeightMm = 25.4,
): LabelElement[] {
  const jewelry = isJewelryLabelSize(labelWidthMm, labelHeightMm);
  return elements.map((element) => {
    if (!jewelry) {
      if (element.type === "barcode" && element.visible) {
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
        if (element.rotation !== 0) return { ...element, rotation: 0 };
      }
      return element;
    }
    const field = JEWELRY_DYMO_FIELDS_MM[element.id];
    if (field && element.visible) {
      return {
        ...element,
        rotation: 0,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        fontSize: field.fontSize ?? element.fontSize,
        bold: field.bold ?? element.bold,
      };
    }
    if (element.type === "barcode" && element.visible) {
      return {
        ...element,
        rotation: 0,
        ...JEWELRY_30299_BARCODE_MM,
      };
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
  if (jewelryTag) return "Small";
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
