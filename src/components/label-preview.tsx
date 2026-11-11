"use client";

import type { VariationRow } from "@/lib/catalog/studio";
import { elementText, fittedFontSize, resolveLabelContent } from "@/lib/labels/resolve";
import type { LabelElement, LabelTemplateData } from "@/lib/labels/types";

export function LabelPreview({
  template,
  variation,
  logo,
  selectedId,
  onSelect,
  onPointerDown,
  interactive,
  zoom = 4,
}: {
  template: Pick<LabelTemplateData, "widthMm" | "heightMm" | "elements">;
  variation: Partial<VariationRow> & { itemName: string; variationName: string; showPrice: boolean };
  logo?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onPointerDown?: (id: string, event: React.PointerEvent) => void;
  interactive?: boolean;
  zoom?: number;
}) {
  const content = resolveLabelContent({ ...variation, logo });
  return (
    <div
      className="relative border border-ink bg-white shadow-sm"
      style={{ width: template.widthMm * zoom, height: template.heightMm * zoom }}
    >
      {template.elements.filter((element) => element.visible).map((element) => (
        <ElementView
          key={element.id}
          element={element}
          text={elementText(element, content)}
          barcode={content.barcodeValue}
          format={variation.barcodeFormat || "code128"}
          logo={content.logo}
          zoom={zoom}
          selected={selectedId === element.id}
          onSelect={interactive ? () => onSelect?.(element.id) : undefined}
          onPointerDown={interactive ? (event) => onPointerDown?.(element.id, event) : undefined}
        />
      ))}
    </div>
  );
}

function ElementView({
  element,
  text,
  barcode,
  format,
  logo,
  zoom,
  selected,
  onSelect,
  onPointerDown,
}: {
  element: LabelElement;
  text: string;
  barcode: string;
  format: string;
  logo: string | null;
  zoom: number;
  selected: boolean;
  onSelect?: () => void;
  onPointerDown?: (event: React.PointerEvent) => void;
}) {
  const turned = element.rotation === 90 || element.rotation === 270;
  const style: React.CSSProperties = {
    position: "absolute",
    left: element.x * zoom,
    top: element.y * zoom,
    width: element.width * zoom,
    height: element.height * zoom,
    transform: element.type === "barcode" ? undefined : `rotate(${element.rotation}deg)`,
    textAlign: element.align,
    fontWeight: element.bold ? 600 : 400,
    fontFamily: element.fontFamily === "Georgia" ? "Georgia, serif" : "var(--font-sans)",
    fontSize: fittedFontSize(text, element.fontSize, element.width, element.bold, element.autoSize, element.height, element.wrap) * (zoom / 3.2),
    lineHeight: 1.15,
    overflow: "hidden",
    outline: selected ? "1px solid #141414" : undefined,
    cursor: onSelect ? "grab" : "default",
    whiteSpace: element.wrap ? "normal" : "nowrap",
  };
  if (element.type === "barcode") {
    const graphic: React.CSSProperties = turned
      ? {
          position: "absolute",
          width: element.height * zoom,
          height: element.width * zoom,
          left: ((element.width - element.height) * zoom) / 2,
          top: ((element.height - element.width) * zoom) / 2,
          transform: `rotate(${element.rotation}deg)`,
        }
      : { width: "100%", height: "100%" };
    return barcode ? (
      <div style={style} onClick={onSelect} onPointerDown={onPointerDown}>
        <img
          src={`/api/barcodes/image?kind=svg&value=${encodeURIComponent(barcode)}&format=${format}&height=${Math.max(6, turned ? element.width : element.height)}`}
          alt=""
          style={graphic}
        />
      </div>
    ) : (
      <div style={style} onClick={onSelect} onPointerDown={onPointerDown} className="border border-dashed border-line text-[10px] text-muted">No barcode</div>
    );
  }
  if (element.type === "logo") {
    return logo ? <img src={logo} alt="" style={{ ...style, objectFit: "contain" }} onClick={onSelect} onPointerDown={onPointerDown} /> : <div style={style} onClick={onSelect} onPointerDown={onPointerDown} />;
  }
  return <div style={style} onClick={onSelect} onPointerDown={onPointerDown}>{text}</div>;
}
