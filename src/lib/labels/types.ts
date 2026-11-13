export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const TWIPS_PER_INCH = 1440;

export function mmToPt(mm: number) {
  return (mm / MM_PER_INCH) * PT_PER_INCH;
}

export function mmToTwips(mm: number) {
  return Math.round((mm / MM_PER_INCH) * TWIPS_PER_INCH);
}

export type LabelElementType =
  | "brand"
  | "productName"
  | "displayName"
  | "variation"
  | "price"
  | "barcode"
  | "barcodeText"
  | "sku"
  | "customText"
  | "logo"
  | "material"
  | "details";

export type LabelElement = {
  id: string;
  type: LabelElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  align: "left" | "center" | "right";
  fontFamily: "Montserrat" | "Georgia";
  fontSize: number;
  bold: boolean;
  rotation: 0 | 90 | 180 | 270;
  wrap: boolean;
  autoSize: boolean;
  customText?: string;
};

export type LabelTemplateData = {
  id?: string;
  name: string;
  widthMm: number;
  heightMm: number;
  marginMm: number;
  elements: LabelElement[];
  isDefault?: boolean;
};

export const ELEMENT_LABELS: Record<LabelElementType, string> = {
  brand: "Brand",
  productName: "Square product name",
  displayName: "Label name",
  variation: "Variation",
  price: "Price",
  barcode: "Barcode",
  barcodeText: "Barcode number",
  sku: "SKU",
  customText: "Custom text",
  logo: "Logo",
  material: "Material",
  details: "Details",
};

export function defaultElements(): LabelElement[] {
  return [
    element("brand", "brand", 0.4, 0.2, 11.9, 1.5, true, { bold: true, fontSize: 5 }),
    element("name", "displayName", 0.4, 1.7, 11.9, 2.4, true, { fontSize: 7, bold: true, wrap: true }),
    element("variation", "variation", 0.4, 1.7, 11.9, 2.4, false, { fontSize: 5, wrap: true }),
    element("price", "price", 0.4, 1.7, 11.9, 2.2, false, { fontSize: 6, bold: true }),
    element("barcode", "barcode", 2.6, 4.4, 7.4, 18.6, true, { fontSize: 5, rotation: 90 }),
    element("code", "barcodeText", 0.4, 23.1, 11.9, 1.6, false, { fontSize: 4 }),
    element("sku", "sku", 0.4, 23.2, 11.9, 1.8, true, { fontSize: 5, wrap: true }),
    element("material", "material", 0.4, 8.2, 11.9, 2.2, false, { fontSize: 5 }),
    element("custom", "customText", 0.4, 21.6, 11.9, 3.4, false, { fontSize: 5, wrap: true, customText: "" }),
    element("details", "details", 0.4, 21.6, 11.9, 3.4, false, { fontSize: 4, wrap: true }),
    element("logo", "logo", 0.4, 0.25, 2.2, 2.2, false, { fontSize: 5 }),
    element("square", "productName", 0.4, 2.3, 11.9, 8, false, { fontSize: 6, wrap: true }),
  ];
}

function element(
  id: string,
  type: LabelElementType,
  x: number,
  y: number,
  width: number,
  height: number,
  visible: boolean,
  extra: Partial<LabelElement> = {},
): LabelElement {
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    visible,
    align: "center",
    fontFamily: "Montserrat",
    fontSize: 8,
    bold: false,
    rotation: 0,
    wrap: false,
    autoSize: true,
    ...extra,
  };
}

export function startingTemplate(): LabelTemplateData {
  return {
    name: "1/2 × 1 in jewelry tag",
    widthMm: 12.7,
    heightMm: 25.4,
    marginMm: 1.5,
    elements: defaultElements(),
    isDefault: true,
  };
}

export function parseElements(value: string): LabelElement[] {
  const parsed = JSON.parse(value) as LabelElement[];
  if (!Array.isArray(parsed)) throw new Error("Template elements are invalid.");
  return parsed;
}
