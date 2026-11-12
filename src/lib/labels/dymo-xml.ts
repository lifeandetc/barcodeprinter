import { mmToTwips } from "@/lib/labels/types";
import type { LabelElement } from "@/lib/labels/types";
import { elementText, type LabelContent } from "@/lib/labels/resolve";

const DYMO_BARCODE: Record<string, string> = {
  code128: "Code128Auto",
  code39: "Code39",
  ean13: "Ean13",
  upca: "UpcA",
  qrcode: "QRCode",
};

export function rowWidthMm(labelWidthMm: number, columns = 1, columnGapMm = 0) {
  const count = Math.max(1, Math.round(columns));
  return labelWidthMm * count + Math.max(0, columnGapMm) * (count - 1);
}

export function dymoLabelXml(input: {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
  content: LabelContent;
  format: string;
  orientation: "landscape" | "portrait";
  columnCount?: number;
  columnGapMm?: number;
  slots?: { elements: LabelElement[]; content: LabelContent; format: string }[];
}) {
  const columns = Math.max(1, Math.round(input.columnCount ?? 1));
  const gap = input.columnGapMm ?? 0;
  const slots = input.slots ?? [{ elements: input.elements, content: input.content, format: input.format }];
  const width = mmToTwips(rowWidthMm(input.widthMm, columns, gap));
  const height = mmToTwips(input.heightMm);
  const objects = slots
    .slice(0, columns)
    .flatMap((slot, slotIndex) =>
      slot.elements
        .filter((element) => element.visible)
        .map((element) => {
          const shifted = { ...element, x: element.x + slotIndex * (input.widthMm + gap) };
          const objectName = columns > 1 ? `${element.id}_${slotIndex + 1}` : element.id;
          return objectXml(shifted, slot.content, slot.format, objectName);
        }),
    )
    .filter(Boolean)
    .join("");

  const paper = dymoPaperMeta(input.widthMm, input.heightMm, columns, gap);
  const draw =
    paper.id === "Jewelry30299"
      ? jewelry30299DrawCommands()
      : `<DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${width}" Height="${height}" Rx="180" Ry="180" />
  </DrawCommands>`;
  const raw = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>${input.orientation === "portrait" ? "Portrait" : "Landscape"}</PaperOrientation>
  <Id>${paper.id}</Id>
  <PaperName>${paper.name}</PaperName>
  ${draw}
  ${objects}
</DieCutLabel>`;
  return fixDymoConnectLabelXml(raw);
}

const DYMO_EXPAND_EMPTY_TAGS = [
  "ForeColor",
  "BackColor",
  "Font",
  "TextFont",
  "CheckSumFont",
  "Color",
  "RoundRectangle",
  "Bounds",
] as const;

function colorTag(name: "ForeColor" | "BackColor", alpha: number, red: number, green: number, blue: number) {
  return emptyElement(name, ` Alpha="${alpha}" Red="${red}" Green="${green}" Blue="${blue}"`);
}

function fontTag(
  name: "Font" | "TextFont" | "CheckSumFont",
  family: string,
  size: number,
  bold: boolean,
) {
  return emptyElement(
    name,
    ` Family="${family}" Size="${size}" Bold="${bold ? "True" : "False"}" Italic="False" Underline="False" Strikeout="False"`,
  );
}

function emptyElement(tag: string, attrs = "") {
  return `<${tag}${attrs}> </${tag}>`;
}

function jewelry30299DrawCommands() {
  const w = mmToTwips(12.7);
  const h = mmToTwips(25.4);
  return `<DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${w}" Height="${h}" Rx="180" Ry="180" />
  </DrawCommands>`;
}

function dymoPaperMeta(widthMm: number, heightMm: number, columns: number, _columnGapMm: number) {
  const jewelry = Math.abs(widthMm - 12.7) < 0.2 && Math.abs(heightMm - 25.4) < 0.2;
  if (jewelry) {
    return { id: "Jewelry30299", name: "30299 Jewelry Label - offset" };
  }
  if (columns > 1) {
    return { id: "Address", name: "30252 Address" };
  }
  return { id: "Address", name: "30252 Address" };
}

/** DYMO Connect’s print service rejects several empty self-closing tags (Font, colors, etc.). */
export function fixDymoConnectLabelXml(xml: string) {
  let out = xml;
  for (const tag of DYMO_EXPAND_EMPTY_TAGS) {
    out = out.replace(new RegExp(`<${tag}([^>]*?)\\s*/>`, "gi"), `<${tag}$1> </${tag}>`);
  }
  return out
    .replace(/<LinkedObjectName\s*\/>/gi, "<LinkedObjectName> </LinkedObjectName>")
    .replace(/<LinkedObjectName><\/LinkedObjectName>/gi, "<LinkedObjectName> </LinkedObjectName>");
}

export type DymoTwinTurboRoll = "Auto" | "Left" | "Right";

export function dymoPrintParams(copies: number, _density: string, twinTurboRoll: DymoTwinTurboRoll = "Auto") {
  const count = Math.max(1, Math.min(copies, 200));
  return `<LabelWriterPrintParams><Copies>${count}</Copies><TwinTurboRoll>${twinTurboRoll}</TwinTurboRoll></LabelWriterPrintParams>`;
}

/** True when this stock should print one DYMO job per sticker (Twin Turbo left/right), not one combined row. */
export function dymoPrintsOneStickerPerJob(widthMm: number, heightMm: number, columns: number) {
  return columns > 1 && Math.abs(widthMm - 12.7) < 0.2 && Math.abs(heightMm - 25.4) < 0.2;
}

export function dymoTwinTurboRollForStickerIndex(index: number): DymoTwinTurboRoll {
  return index % 2 === 0 ? "Left" : "Right";
}

function objectXml(element: LabelElement, content: LabelContent, format: string, objectName: string) {
  const bounds = `<Bounds X="${mmToTwips(element.x)}" Y="${mmToTwips(element.y)}" Width="${mmToTwips(element.width)}" Height="${mmToTwips(element.height)}" />`;
  if (element.type === "logo") return "";
  if (element.type === "barcode") {
    if (!content.barcodeValue) return "";
    return `<ObjectInfo>
      <BarcodeObject>
        <Name>${escapeXml(objectName)}</Name>
        ${colorTag("ForeColor", 255, 0, 0, 0)}
        ${colorTag("BackColor", 0, 255, 255, 255)}
        <LinkedObjectName> </LinkedObjectName>
        <Rotation>Rotation${element.rotation}</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <Text>${escapeXml(content.barcodeValue)}</Text>
        <Type>${DYMO_BARCODE[format] ?? "Code128Auto"}</Type>
        <Size>Small</Size>
        <TextPosition>None</TextPosition>
        ${fontTag("TextFont", "Arial", 8, false)}
        ${fontTag("CheckSumFont", "Arial", 8, false)}
        <TextEmbedding>None</TextEmbedding>
        <ECLevel>0</ECLevel>
        <HorizontalAlignment>${align(element.align)}</HorizontalAlignment>
        <QuietZonesPadding>2</QuietZonesPadding>
      </BarcodeObject>
      ${bounds}
    </ObjectInfo>`;
  }
  const text = elementText(element, content);
  if (!text) return "";
  const family = element.fontFamily === "Georgia" ? "Georgia" : "Arial";
  return `<ObjectInfo>
    <TextObject>
      <Name>${escapeXml(objectName)}</Name>
      ${colorTag("ForeColor", 255, 0, 0, 0)}
      ${colorTag("BackColor", 0, 255, 255, 255)}
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation${element.rotation}</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <HorizontalAlignment>${align(element.align)}</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>${element.autoSize ? "ShrinkToFit" : "None"}</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>${escapeXml(text)}</String>
          <Attributes>
            ${fontTag("Font", family, element.fontSize, element.bold)}
            ${colorTag("ForeColor", 255, 0, 0, 0)}
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    ${bounds}
  </ObjectInfo>`;
}

function align(value: LabelElement["align"]) {
  if (value === "left") return "Left";
  if (value === "right") return "Right";
  return "Center";
}

function escapeXml(value: string | number) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
