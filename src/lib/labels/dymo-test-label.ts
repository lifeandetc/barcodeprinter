import { fixDymoConnectLabelXml } from "@/lib/labels/dymo-xml";

/** Tiny text-only label from DYMO’s SDK samples — use to confirm Connect + USB before product XML. */
export function dymoSanityTestLabelXml() {
  const raw = `<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Landscape</PaperOrientation>
  <Id>Address</Id>
  <PaperName>30252 Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="1581" Height="5040" Rx="270" Ry="270"> </RoundRectangle>
  </DrawCommands>
  <ObjectInfo>
    <TextObject>
      <Name>TEXT</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation0</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>True</IsVariable>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>Life and Etc test</String>
          <Attributes>
            <Font Family="Arial" Size="12" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="331" Y="150" Width="1200" Height="800"> </Bounds>
  </ObjectInfo>
</DieCutLabel>`;
  return fixDymoConnectLabelXml(raw);
}
