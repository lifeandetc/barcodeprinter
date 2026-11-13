import { formatMoney } from "@/lib/format";
import type { LabelElement } from "@/lib/labels/types";

export type LabelContent = {
  brand: string;
  productName: string;
  displayName: string;
  variation: string;
  price: string;
  sku: string;
  barcodeValue: string;
  customText: string;
  material: string;
  details: string;
  logo: string | null;
};

export function specificVariation(name: string | null | undefined) {
  const value = name?.trim() ?? "";
  if (!value || /^(regular|default|variation|standard)$/i.test(value)) return "";
  return value;
}

export function withVariation(title: string, variationName: string | null | undefined) {
  const variation = specificVariation(variationName);
  if (!variation) return title;
  if (title.toLowerCase().includes(variation.toLowerCase())) return title;
  return `${title} · ${variation}`;
}

export function resolveLabelContent(input: {
  productName?: string;
  itemName?: string;
  variationName: string;
  displayName?: string | null;
  customText?: string | null;
  material?: string | null;
  details?: string | null;
  sku?: string | null;
  barcodeValue?: string | null;
  showPrice: boolean;
  priceAmount?: number | null;
  currency?: string | null;
  logo?: string | null;
}): LabelContent {
  const productName = input.productName || input.itemName || "";
  const title = input.displayName?.trim() || productName;
  return {
    brand: "LIFE & ETC.",
    productName,
    displayName: withVariation(title, input.variationName),
    variation: input.variationName,
    price: input.showPrice ? formatMoney(input.priceAmount, input.currency ?? "USD") : "",
    sku: input.sku ?? "",
    barcodeValue: input.barcodeValue ?? "",
    customText: input.customText?.trim() ?? "",
    material: input.material?.trim() ?? "",
    details: input.details?.trim() ?? "",
    logo: input.logo ?? null,
  };
}

export function elementText(element: LabelElement, content: LabelContent) {
  switch (element.type) {
    case "brand":
      return element.customText?.trim() || content.brand;
    case "productName":
      return content.productName;
    case "displayName":
      return content.displayName;
    case "variation":
      return content.variation;
    case "price":
      return content.price;
    case "barcodeText":
      return content.barcodeValue;
    case "sku":
      return content.sku;
    case "customText":
      return element.customText?.trim() || content.customText;
    case "material":
      return content.material;
    case "details":
      return content.details;
    default:
      return "";
  }
}

export function fittedFontSize(
  text: string,
  fontSize: number,
  widthMm: number,
  bold: boolean,
  autoSize: boolean,
  heightMm = 100,
  wrap = false,
) {
  if (!autoSize || !text) return fontSize;
  const charMm = bold ? 0.22 : 0.2;
  let size = fontSize;
  while (size > 3.5) {
    const perLine = Math.max(1, Math.floor(widthMm / (size * charMm)));
    const lines = wrap ? Math.ceil(text.length / perLine) : 1;
    const fitsWidth = wrap || text.length <= perLine;
    const fitsHeight = lines * size * 0.42 <= heightMm;
    if (fitsWidth && fitsHeight) return size;
    size -= 0.5;
  }
  return 3.5;
}
