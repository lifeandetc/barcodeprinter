import type { LabelContent } from "@/lib/labels/resolve";
import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";
import type { DymoLabelHandle } from "@/lib/printing/dymo-client";

const JEWELRY_LABEL_PATH = "/labels/jewelry-30299.label";

function applyJewelryFields(label: DymoLabelHandle, content: LabelContent) {
  const brand = content.brand || "LIFE & ETC.";
  const title = content.displayName || content.productName;
  const code = content.barcodeValue || content.sku || "";
  const sku = content.sku || content.barcodeValue || "";
  label.setObjectText?.("BRAND", brand);
  label.setObjectText?.("TITLE", title);
  label.setObjectText?.("BARCODE", code);
  label.setObjectText?.("SKU", sku);
}

/** Load label through DYMO Connect when possible so the service normalizes XML like the desktop app. */
export async function openJewelryDymoLabel(content: LabelContent): Promise<DymoLabelHandle> {
  const framework = window.dymo?.label?.framework;
  if (!framework?.openLabelXml) {
    throw new Error("DYMO framework is not loaded.");
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const fileUrl = `${origin}${JEWELRY_LABEL_PATH}`;

  const openLabelFileAsync = (framework as { openLabelFileAsync?: (url: string) => Promise<DymoLabelHandle> })
    .openLabelFileAsync;
  if (openLabelFileAsync) {
    try {
      const label = await openLabelFileAsync(fileUrl);
      applyJewelryFields(label, content);
      return label;
    } catch {
      // fall through to fetch
    }
  }

  const text = await fetch(JEWELRY_LABEL_PATH).then((response) => {
    if (!response.ok) throw new Error("Could not load the DYMO jewelry label template.");
    return response.text();
  });
  const label = framework.openLabelXml(fixDymoConnectLabelXml(text));
  applyJewelryFields(label, content);
  return label;
}
