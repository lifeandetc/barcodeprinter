import type { LabelContent } from "@/lib/labels/resolve";
import { JEWELRY_30299_LABEL_TEMPLATE } from "@/lib/labels/jewelry-30299-template";
import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** DYMO Connect drops the rest of a label when a text object contains characters outside ASCII. */
function dymoText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function jewelryLabelTitle(content: LabelContent) {
  const name = dymoText(content.displayName || content.productName);
  const variation = dymoText(content.variation);
  if (!variation || /^regular$/i.test(variation)) return name;
  if (name.toLowerCase().includes(variation.toLowerCase())) return name;
  return `${name} ${variation}`.trim();
}

export type JewelryPrintSlot = {
  title: string;
  /** The Barcode Generator PNG, base64, no data-URL prefix. */
  imageBase64: string;
};

function inches(mm: number) {
  return (mm / 25.4).toFixed(4);
}

const brushes = `<Brushes>
            <BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush>
            <BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush>
            <StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush>
            <FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></FillBrush>
          </Brushes>`;

function layout(xMm: number, yMm: number, widthMm: number, heightMm: number) {
  return `<ObjectLayout>
            <DYMOPoint><X>${inches(xMm)}</X><Y>${inches(yMm)}</Y></DYMOPoint>
            <Size><Width>${inches(widthMm)}</Width><Height>${inches(heightMm)}</Height></Size>
          </ObjectLayout>`;
}

/** One picture per sticker: the name and the barcode are already drawn inside it. */
function tagImage(name: string, imageBase64: string, xMm: number, labelWidthMm: number, labelHeightMm: number) {
  return `<ImageObject>
          <Name>${name}</Name>
          ${brushes}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>0</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <Data>${imageBase64.replace(/\s/g, "")}</Data>
          <ScaleMode>Uniform</ScaleMode>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          ${layout(xMm, 0, labelWidthMm, labelHeightMm)}
        </ImageObject>`;
}

/** Two jewelry stickers side by side. Each barcode is the Barcode Generator image. */
export function buildJewelryRowXml(input: {
  slots: JewelryPrintSlot[];
  columns?: number;
  gapMm?: number;
  labelWidthMm?: number;
  labelHeightMm?: number;
}) {
  const labelWidthMm = input.labelWidthMm ?? 12.7;
  const labelHeightMm = input.labelHeightMm ?? 25.4;
  const gapMm = input.gapMm ?? 2;
  const columns = Math.max(1, input.columns ?? input.slots.length);
  const widthMm = labelWidthMm * columns + gapMm * (columns - 1);
  const objects = input.slots.slice(0, columns).map((slot, index) => {
    const x = index * (labelWidthMm + gapMm);
    return tagImage(`TAG_${index + 1}`, slot.imageBase64, x, labelWidthMm, labelHeightMm);
  });
  const raw = `<?xml version="1.0" encoding="utf-8"?>
<LabelFile version="1">
  <DYMOLabel>
    <Description>Jewelry</Description>
    <Orientation>Portrait</Orientation>
    <LabelName>Address</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint><X>0</X><Y>0</Y></DYMOPoint>
      <Size><Width>${inches(widthMm)}</Width><Height>${inches(labelHeightMm)}</Height></Size>
    </DYMORect>
    <BorderColor><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        ${objects.join("")}
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
</LabelFile>`;
  return fixDymoConnectLabelXml(raw);
}

/** One 1/2 × 1 in tag: product name, then a vertical Code 128 of the Square SKU. */
export function buildJewelryLabelXml(content: LabelContent): string {
  const brand = escapeXml(dymoText(content.brand || "LIFE & ETC."));
  const title = escapeXml(jewelryLabelTitle(content));
  const code = escapeXml(content.barcodeValue || content.sku || "");
  const sku = escapeXml(dymoText(content.sku || content.barcodeValue || ""));
  const filled = JEWELRY_30299_LABEL_TEMPLATE.replace("__BRAND__", brand)
    .replace("__TITLE__", title)
    .replace("__BARCODE__", code)
    .replace("__SKU__", sku);
  return fixDymoConnectLabelXml(filled);
}
