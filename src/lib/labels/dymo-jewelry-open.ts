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

/** Point size that keeps the whole name on the tag. 5pt fits a normal jewelry name on the 1 in side. */
function nameFontSize(title: string) {
  if (title.length <= 28) return "5";
  const fitted = 20 / (title.length * 0.5 * 0.3528);
  const stepped = Math.round(fitted * 2) / 2;
  return Math.max(3.5, stepped).toFixed(1);
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
          ${layout(xMm + 0.5, 2, 3.6, 20.3)}
        </TextObject>`;
}

/** The generator code, already turned, kept inside the sticker beside the name. */
function generatorImage(name: string, imageBase64: string, xMm: number, labelWidthMm: number, heightMm: number) {
  const x = xMm + 4.6;
  const y = 3;
  const width = Math.max(4, labelWidthMm - 5.4);
  const height = Math.max(8, heightMm - 6);
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
          ${layout(x, y, width, height)}
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
      generatorImage(`BARCODE_${index + 1}`, slot.imageBase64, x, labelWidthMm, labelHeightMm),
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
