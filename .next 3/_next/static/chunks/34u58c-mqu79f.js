(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,37972,e=>{"use strict";let t=`<?xml version="1.0" encoding="utf-8"?>
<DieCutLabel Version="8.0" Units="twips">
  <PaperOrientation>Portrait</PaperOrientation>
  <Id>Address</Id>
  <PaperName>30252 Address</PaperName>
  <DrawCommands>
    <RoundRectangle X="0" Y="0" Width="720" Height="1440" Rx="270" Ry="270"> </RoundRectangle>
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
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__BRAND__</String>
          <Attributes>
            <Font Family="Arial" Size="6" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="12" Width="640" Height="80"> </Bounds>
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
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__TITLE__</String>
          <Attributes>
            <Font Family="Arial" Size="7" Bold="True" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="100" Width="640" Height="140"> </Bounds>
  </ObjectInfo>
  <ObjectInfo>
    <BarcodeObject>
      <Name>BARCODE</Name>
      <ForeColor Alpha="255" Red="0" Green="0" Blue="0"> </ForeColor>
      <BackColor Alpha="0" Red="255" Green="255" Blue="255"> </BackColor>
      <LinkedObjectName> </LinkedObjectName>
      <Rotation>Rotation90</Rotation>
      <IsMirrored>False</IsMirrored>
      <IsVariable>False</IsVariable>
      <Text>__BARCODE__</Text>
      <Type>Code128Auto</Type>
      <Size>Large</Size>
      <TextPosition>None</TextPosition>
      <TextFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </TextFont>
      <CheckSumFont Family="Arial" Size="8" Bold="False" Italic="False" Underline="False" Strikeout="False"> </CheckSumFont>
      <TextEmbedding>None</TextEmbedding>
      <ECLevel>0</ECLevel>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <QuietZonesPadding>4</QuietZonesPadding>
    </BarcodeObject>
    <Bounds X="150" Y="250" Width="420" Height="1080"> </Bounds>
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
      <GroupID>-1</GroupID>
      <IsOutlined>False</IsOutlined>
      <HorizontalAlignment>Center</HorizontalAlignment>
      <VerticalAlignment>Middle</VerticalAlignment>
      <TextFitMode>ShrinkToFit</TextFitMode>
      <UseFullFontHeight>True</UseFullFontHeight>
      <Verticalized>False</Verticalized>
      <StyledText>
        <Element>
          <String>__SKU__</String>
          <Attributes>
            <Font Family="Arial" Size="5" Bold="False" Italic="False" Underline="False" Strikeout="False"> </Font>
            <ForeColor Alpha="255" Red="0" Green="0" Blue="0" HueScale="100"> </ForeColor>
          </Attributes>
        </Element>
      </StyledText>
    </TextObject>
    <Bounds X="40" Y="1340" Width="640" Height="90"> </Bounds>
  </ObjectInfo>
</DieCutLabel>`;var o=e.i(94194);function l(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function r(e){return e.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g," ").replace(/\s+/g," ").trim()}function i(e){let t=r(e.displayName||e.productName),o=r(e.variation);return!o||/^regular$/i.test(o)||t.toLowerCase().includes(o.toLowerCase())?t:`${t} ${o}`.trim()}function a(e){return(e/25.4).toFixed(4)}let n=`<Brushes>
            <BackgroundBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></BackgroundBrush>
            <BorderBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderBrush>
            <StrokeBrush><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></StrokeBrush>
            <FillBrush><SolidColorBrush><Color A="0" R="1" G="1" B="1"></Color></SolidColorBrush></FillBrush>
          </Brushes>`;e.s(["buildJewelryLabelXml",0,function(e){let a=l(r(e.brand||"LIFE & ETC.")),n=l(i(e)),s=l(e.barcodeValue||e.sku||""),d=l(r(e.sku||e.barcodeValue||"")),u=t.replace("__BRAND__",a).replace("__TITLE__",n).replace("__BARCODE__",s).replace("__SKU__",d);return(0,o.fixDymoConnectLabelXml)(u)},"buildJewelryRowXml",0,function(e){let t=e.labelWidthMm??12.7,l=e.labelHeightMm??25.4,r=e.gapMm??2,i=Math.max(1,e.columns??e.slots.length),s=e.slots.slice(0,i).map((e,o)=>{var i,s,d;return i=`TAG_${o+1}`,s=e.imageBase64,d=o*(t+r),`<ImageObject>
          <Name>${i}</Name>
          ${n}
          <Rotation>Rotation0</Rotation>
          <OutlineThickness>0</OutlineThickness>
          <IsOutlined>False</IsOutlined>
          <Margin><DYMOThickness Left="0" Top="0" Right="0" Bottom="0" /></Margin>
          <Data>${s.replace(/\s/g,"")}</Data>
          <ScaleMode>Uniform</ScaleMode>
          <HorizontalAlignment>Center</HorizontalAlignment>
          <VerticalAlignment>Middle</VerticalAlignment>
          <ObjectLayout>
            <DYMOPoint><X>${a(d)}</X><Y>${a(0)}</Y></DYMOPoint>
            <Size><Width>${a(t)}</Width><Height>${a(l)}</Height></Size>
          </ObjectLayout>
        </ImageObject>`}),d=`<?xml version="1.0" encoding="utf-8"?>
<LabelFile version="1">
  <DYMOLabel>
    <Description>Jewelry</Description>
    <Orientation>Portrait</Orientation>
    <LabelName>Address</LabelName>
    <InitialLength>0</InitialLength>
    <BorderStyle>SolidLine</BorderStyle>
    <DYMORect>
      <DYMOPoint><X>0</X><Y>0</Y></DYMOPoint>
      <Size><Width>${a(t*i+r*(i-1))}</Width><Height>${a(l)}</Height></Size>
    </DYMORect>
    <BorderColor><SolidColorBrush><Color A="1" R="0" G="0" B="0"></Color></SolidColorBrush></BorderColor>
    <BorderThickness>0</BorderThickness>
    <Show_Border>False</Show_Border>
    <DynamicLayoutManager>
      <RotationBehavior>ClearObjects</RotationBehavior>
      <LabelObjects>
        ${s.join("")}
      </LabelObjects>
    </DynamicLayoutManager>
  </DYMOLabel>
</LabelFile>`;return(0,o.fixDymoConnectLabelXml)(d)},"jewelryLabelTitle",0,i],37972)}]);