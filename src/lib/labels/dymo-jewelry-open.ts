import type { LabelContent } from "@/lib/labels/resolve";
import { jewelryRowDrawCommands } from "@/lib/labels/jewelry-dymo-layout";
import { JEWELRY_30299_LABEL_TEMPLATE } from "@/lib/labels/jewelry-30299-template";
import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";
import { mmToTwips } from "@/lib/labels/types";

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
  code: string;
  /** PNG from the Barcode Generator, already rotated so the bars run down the tag. */
  imageBase64: string;
  imageWidth: number;
  imageHeight: number;
};

function nameLines(title: string) {
  const clean = title.trim();
  const words = clean.split(" ").filter(Boolean);
  if (clean.length <= 18 || words.length < 2) return [clean];
  let first = words[0] ?? clean;
  let index = 1;
  while (index < words.length && `${first} ${words[index]}`.length <= 18) {
    first = `${first} ${words[index]}`;
    index += 1;
  }
  const rest = words.slice(index).join(" ");
  return rest ? [first, rest] : [first];
}

function textObject(name: string, lines: string[], bounds: string, size: number, bold: boolean) {
  const elements = lines
    .map(
      (line) => `<Element>
          <String>${escapeXml(line)}</String>
          <Attributes>
            <Font Family="Arial" Size="${size}" Bold="${bold ? "True" : "False"}" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
          </Attributes>
        </Element>`,
    )
    .join("");
  return `<ObjectInfo>
    <TextObject>
      <Name>${name}</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>${elements}</StyledText>
    </TextObject>
    <Bounds ${bounds}> </Bounds>
  </ObjectInfo>`;
}

function imageObject(name: string, imageBase64: string, bounds: string) {
  return `<ObjectInfo>
    <ImageObject>
      <Name>${name}</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <ImageLocation> </ImageLocation>
      <ScaleMode>Uniform</ScaleMode>
      <BorderWidth>0</BorderWidth>
      <BorderColor Alpha="255" Red="0" Green="0" Blue="0"> </BorderColor>
      <Data>${imageBase64.replace(/\s/g, "")}</Data>
    </ImageObject>
    <Bounds ${bounds}> </Bounds>
  </ObjectInfo>`;
}

/** Fit the rotated generator image in the scan area without stretching the bars. */
function barcodeBounds(x: number, cellW: number, imageWidth: number, imageHeight: number) {
  const maxLength = 1040;
  const maxThickness = Math.max(120, cellW - 80);
  const widthPx = Math.max(1, imageWidth);
  const heightPx = Math.max(1, imageHeight);
  let drawW = maxThickness;
  let drawH = Math.round((drawW * heightPx) / widthPx);
  if (drawH > maxLength) {
    drawH = maxLength;
    drawW = Math.round((drawH * widthPx) / heightPx);
  }
  const left = x + Math.round((cellW - drawW) / 2);
  const top = 240 + Math.round((maxLength - drawH) / 2);
  return `X="${left}" Y="${top}" Width="${drawW}" Height="${drawH}"`;
}

/** Two jewelry stickers side by side. Each one uses the Barcode Generator image and the product name. */
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
  const cellW = mmToTwips(labelWidthMm);
  const gap = mmToTwips(gapMm);
  const objects = input.slots.slice(0, columns).map((slot, index) => {
    const x = index * (cellW + gap);
    const title = nameLines(dymoText(slot.title));
    const code = dymoText(slot.code);
    return [
      textObject(`NAME_${index + 1}`, title, `X="${x + 40}" Y="16" Width="${cellW - 80}" Height="210"`, 7, true),
      imageObject(`BARCODE_${index + 1}`, slot.imageBase64, barcodeBounds(x, cellW, slot.imageWidth, slot.imageHeight)),
      textObject(`CODE_${index + 1}`, [code], `X="${x + 40}" Y="1320" Width="${cellW - 80}" Height="90"`, 6, false),
    ].join("");
  });
  const raw = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Portrait</PaperOrientation>
  <Id>Address</Id>
  <PaperName>30252 Address</PaperName>
  ${jewelryRowDrawCommands(labelWidthMm, labelHeightMm, columns, gapMm)}
  ${objects.join("")}
</DieCutLabel>`;
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
