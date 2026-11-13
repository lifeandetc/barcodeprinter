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
  /** 300 dpi PNG of the Square code, already turned to run along the tag, base64, no data-URL prefix. */
  imageBase64: string;
  imageWidthPx: number;
  imageHeightPx: number;
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

/** Point size that keeps the name on the straight part of the tag, clear of the rounded corners. */
function nameFontSize(title: string) {
  const fitted = 20 / (Math.max(title.length, 1) * 0.18);
  const stepped = Math.round(fitted * 2) / 2;
  return Math.min(8, Math.max(4.5, stepped)).toFixed(1);
}

function nameObject(name: string, title: string, xMm: number, heightMm: number) {
  return `<TextObject>
          <Name>${name}</Name>
          ${brushes}
          <Rotation>Rotation90</Rotation>
          <OutlineThickness>0</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <FitMode>ShrinkToFit</FitMode>
          <IsVertical>False</IsVertical>
          <FormattedText>
            <FitMode>ShrinkToFit</FitMode>
            <HorizontalAlignment>Center</HorizontalAlignment>
            <VerticalAlignment>Middle</VerticalAlignment>
            <IsVertical>False</IsVertical>
            <LineTextSpan>
              <TextSpan>
                <Text>${escapeXml(title)}</Text>
                <FontInfo>
                  <FontName>Arial</FontName>
                  <FontSize>${nameFontSize(title)}</FontSize>
                  <IsBold>False</IsBold>
                  <IsItalic>False</IsItalic>
                  <IsUnderline>False</IsUnderline>
                  <FontBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></FontBrush>
                </FontInfo>
              </TextSpan>
            </LineTextSpan>
          </FormattedText>
          ${layout(xMm + 1, 2, 3, heightMm - 4)}
        </TextObject>`;
}

/** Place the 300 dpi picture at its real size. One pixel is one printer dot, so the bars stay even. */
function generatorImage(name: string, imageBase64: string, xMm: number, labelWidthMm: number, labelHeightMm: number, imageWidthPx: number, imageHeightPx: number) {
  const acrossMm = (imageWidthPx / 300) * 25.4;
  const alongMm = (imageHeightPx / 300) * 25.4;
  const x = xMm + labelWidthMm - 0.4 - acrossMm;
  const y = Math.max(0.4, (labelHeightMm - alongMm) / 2);
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
          ${layout(x, y, acrossMm, alongMm)}
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
    const title = dymoText(slot.title);
    return [
      nameObject(`NAME_${index + 1}`, title, x, labelHeightMm),
      generatorImage(`BARCODE_${index + 1}`, slot.imageBase64, x, labelWidthMm, labelHeightMm, slot.imageWidthPx, slot.imageHeightPx),
    ].join("");
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
