import { mmToTwips } from "@/lib/labels/types";
import type { LabelContent } from "@/lib/labels/resolve";
import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";

const DYMO_BARCODE: Record<string, string> = {
  code128: "Code128Auto",
  code39: "Code39",
  ean13: "Ean13",
  upca: "UpcA",
  qrcode: "QRCode",
};

/** Minimal ½″×1″ label XML using DYMO’s known Address stock id (Connect accepts custom draw size). */
export function dymoJewelryPrintXml(content: LabelContent, format: string) {
  const w = mmToTwips(12.7);
  const h = mmToTwips(25.4);
  const title = escapeXml(content.displayName || content.productName);
  const brand = escapeXml(content.brand || "LIFE & ETC.");
  const code = escapeXml(content.barcodeValue || content.sku);
  const sku = escapeXml(content.sku || content.barcodeValue);
  const barcodeType = DYMO_BARCODE[format] ?? "Code128Auto";

  const raw = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Portrait</PaperOrientation>
  <Id>Jewelry30299</Id>
  <PaperName>30299 Jewelry Label - offset</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="${w}" Height="${h}" Rx="270" Ry="270"> </RoundRectangle>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>BRAND</Name>
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
      <StyledText>
        <Element>
          <String>${brand}</String>
          <Attributes>
            <Font Family="Arial" Size="6" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="20" Width="640" Height="120"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>TITLE</Name>
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
      <StyledText>
        <Element>
          <String>${title}</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="130" Width="640" Height="420"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <BarcodeObject>
      <Name>BARCODE</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <Text>${code}</Text>
      <Type>${barcodeType}</Type>
      <Size>Small</Size>
      <TextPosition>None</TextPosition>
      <TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </TextFont>
      <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </CheckSumFont>
      <TextEmbedding>None</TextEmbedding>
      <ECLevel>0</ECLevel>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <QuietZonesPadding>2</QuietZonesPadding>
    </BarcodeObject>
    <Bounds X="100" Y="570" Width="520" Height="520"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <TextObject>
      <Name>SKU</Name>
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
      <StyledText>
        <Element>
          <String>${sku}</String>
          <Attributes>
            <Font Family="Arial" Size="5" Bold="False" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="1120" Width="640" Height="280"> </Bounds>
  </ObjectInfo>
</DieCutLabel>`;
  return fixDymoConnectLabelXml(raw);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
