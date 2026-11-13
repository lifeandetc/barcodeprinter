import { labelSkuLine, type LabelContent } from "@/lib/labels/resolve";
import { JEWELRY_30299_LABEL_TEMPLATE } from "@/lib/labels/jewelry-30299-template";
import { dymoPlain, fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build print-ready DYMO XML in the browser (no extra HTTP fetch required). */
export function buildJewelryLabelXml(content: LabelContent): string {
  const brand = escapeXml(dymoPlain(content.brand || "LIFE & ETC."));
  const title = escapeXml(dymoPlain(content.displayName || content.productName));
  const code = (content.barcodeValue || content.sku || "").trim();
  const sku = escapeXml(dymoPlain(labelSkuLine(content.variation, content.sku || content.barcodeValue) || code));
  const filled = JEWELRY_30299_LABEL_TEMPLATE.replace("__BRAND__", brand)
    .replace("__TITLE__", title)
    .replace("__BARCODE__", escapeXml(code))
    .replace("__SKU__", sku);
  return fixDymoConnectLabelXml(filled);
}
