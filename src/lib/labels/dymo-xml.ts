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
    .flatMap((slot, index) =>
      slot.elements
        .filter((element) => element.visible)
        .map((element) => objectXml({ ...element, x: element.x + index * (input.widthMm + gap) }, slot.content, slot.format)),
    )
    .filter(Boolean)
    .join("");

  return `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>${input.orientation === "portrait" ? "Portrait" : "Landscape"}</PaperOrientation>
  <Id>LifeEtcCustom</Id>
  <PaperName>Life &amp; Etc. ${escapeXml(input.widthMm)}mm x ${escapeXml(input.heightMm)}mm</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${width}" Height="${height}" Rx="0" Ry="0" />
  </DrawCommands>
  ${objects}
</DieCutLabel>`;
}

export function dymoPrintParams(copies: number, density: string) {
  const quality = density === "text" ? "Text" : "Barcode";
  return `<?xml version="1.0" encoding="utf-8"?>
<LabelWriterPrintParams>
  <Copies>${Math.max(1, Math.min(copies, 200))}</Copies>
  <JobTitle>Life &amp; Etc.</JobTitle>
  <PrintQuality>${quality}</PrintQuality>
  <TwinTurboRoll>Auto</TwinTurboRoll>
</LabelWriterPrintParams>`;
}

function objectXml(element: LabelElement, content: LabelContent, format: string) {
  const bounds = `<Bounds X="${mmToTwips(element.x)}" Y="${mmToTwips(element.y)}" Width="${mmToTwips(element.width)}" Height="${mmToTwips(element.height)}" />`;
  if (element.type === "logo") return "";
  if (element.type === "barcode") {
    if (!content.barcodeValue) return "";
    return `<ObjectInfo>
      <BarcodeObject>
        <Name>${element.id}</Name>
        <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
        <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
        <LinkedObjectName></LinkedObjectName>
        <Rotation>Rotation${element.rotation}</Rotation>
        <IsMirrored>False</IsMirrored>
        <IsVariable>False</IsVariable>
        <Text>${escapeXml(content.barcodeValue)}</Text>
        <Type>${DYMO_BARCODE[format] ?? "Code128Auto"}</Type>
        <Size>Small</Size>
        <TextPosition>None</TextPosition>
        <TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
        <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False" />
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
      <Name>${element.id}</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
      <BackColor Alpha="0" Red="255" Green="255" Blue="255" />
      <LinkedObjectName></LinkedObjectName>
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
            <Font Family="${family}" Size="${element.fontSize}" Bold="${element.bold ? "True" : "False"}" Italic="False" Underline="False" Strikeout="False" />
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" />
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
