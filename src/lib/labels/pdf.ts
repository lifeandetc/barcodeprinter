import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import { barcodePng } from "@/lib/barcodes/render";
import { assessBarcode } from "@/lib/labels/scan";
import { elementText, fittedFontSize, type LabelContent } from "@/lib/labels/resolve";
import { rowWidthMm } from "@/lib/labels/dymo-xml";
import { mmToPt, type LabelElement } from "@/lib/labels/types";

export type PdfLabel = {
  widthMm: number;
  heightMm: number;
  elements: LabelElement[];
  content: LabelContent;
  format: string;
};

export type PdfPlacement = {
  offsetXMm: number;
  offsetYMm: number;
  scale: number;
  columns?: number;
  columnGapMm?: number;
};

const ink = rgb(0, 0, 0);

export async function buildLabelsPdf(labels: PdfLabel[], placement: PdfPlacement) {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    serif: await pdf.embedFont(StandardFonts.TimesRoman),
    serifBold: await pdf.embedFont(StandardFonts.TimesRomanBold),
  };
  const columns = Math.max(1, Math.round(placement.columns ?? 1));
  const gap = placement.columnGapMm ?? 0;
  for (let index = 0; index < labels.length; index += columns) {
    const row = labels.slice(index, index + columns);
    const label = row[0];
    const page = pdf.addPage([mmToPt(rowWidthMm(label.widthMm, columns, gap)), mmToPt(label.heightMm)]);
    for (let column = 0; column < row.length; column += 1) {
      const cell = row[column];
      const logo = await embedLogo(pdf, cell.content.logo);
      let barcode: PDFImage | null = null;
      if (cell.content.barcodeValue && cell.elements.some((element) => element.visible && element.type === "barcode")) {
        const png = await barcodePng(cell.content.barcodeValue, cell.format, 12);
        barcode = await pdf.embedPng(png);
      }
      const shifted = { ...placement, offsetXMm: placement.offsetXMm + column * (cell.widthMm + gap) };
      for (const element of cell.elements) {
        if (!element.visible) continue;
        drawElement(page, element, cell, shifted, fonts, barcode, logo);
      }
    }
  }
  return pdf.save();
}

export async function buildCalibrationPdf(input: {
  widthMm: number;
  heightMm: number;
  offsetXMm: number;
  offsetYMm: number;
  scale: number;
  columns?: number;
  columnGapMm?: number;
}) {
  const columns = Math.max(1, Math.round(input.columns ?? 1));
  const gap = input.columnGapMm ?? 0;
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([mmToPt(rowWidthMm(input.widthMm, columns, gap)), mmToPt(input.heightMm)]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const place = (xMm: number, yMm: number, column = 0) => ({
    x: mmToPt(input.offsetXMm + (column * (input.widthMm + gap) + xMm) * input.scale),
    y: page.getHeight() - mmToPt(input.offsetYMm + yMm * input.scale),
  });
  const inset = Math.min(1, input.widthMm / 10, input.heightMm / 10);
  const tick = mmToPt(Math.min(2, input.widthMm / 8, input.heightMm / 8) * input.scale);
  const corners = [
    [inset, inset],
    [input.widthMm - inset, inset],
    [inset, input.heightMm - inset],
    [input.widthMm - inset, input.heightMm - inset],
  ];
  for (let column = 0; column < columns; column += 1) {
    for (const [x, y] of corners) {
      const point = place(x, y, column);
      page.drawLine({ start: { x: point.x - tick, y: point.y }, end: { x: point.x + tick, y: point.y }, thickness: 0.6, color: ink });
      page.drawLine({ start: { x: point.x, y: point.y - tick }, end: { x: point.x, y: point.y + tick }, thickness: 0.6, color: ink });
    }
  }
  const barMm = Math.min(10, Math.max(input.widthMm, input.heightMm) - inset * 2);
  const barStart = place(inset, input.heightMm - inset);
  page.drawLine({
    start: { x: barStart.x, y: barStart.y },
    end: { x: barStart.x + mmToPt(Math.min(barMm, input.widthMm - inset * 2) * input.scale), y: barStart.y },
    thickness: 1,
    color: ink,
  });
  page.drawText(`${barMm} mm`, { x: barStart.x, y: barStart.y - mmToPt(1.6), size: 4, font, color: ink });
  page.drawText("Life & Etc.", {
    x: place(inset, inset + 2).x,
    y: place(inset, inset + 2).y,
    size: input.widthMm < 20 ? 4 : 8,
    font: bold,
    color: ink,
  });
  const sample = calibrationBarcode(input.widthMm, input.heightMm);
  if (sample) {
    const png = await barcodePng(sample, "code128", 8);
    const image = await pdf.embedPng(png);
    const turned = input.heightMm > input.widthMm;
    const barcodeWidth = mmToPt((turned ? Math.min(8, input.widthMm - 3) : Math.min(40, input.widthMm - 4)) * input.scale);
    const barcodeHeight = mmToPt((turned ? Math.min(16, input.heightMm - 8) : Math.min(8, input.heightMm / 2.4)) * input.scale);
    const barcodePoint = place(input.widthMm / 2, input.heightMm / 2);
    if (turned) {
      page.drawImage(image, {
        x: barcodePoint.x + barcodeWidth / 2,
        y: barcodePoint.y - barcodeHeight / 2,
        width: barcodeHeight,
        height: barcodeWidth,
        rotate: degrees(90),
      });
    } else {
      page.drawImage(image, {
        x: barcodePoint.x - barcodeWidth / 2,
        y: barcodePoint.y - barcodeHeight / 2,
        width: barcodeWidth,
        height: barcodeHeight,
      });
    }
  }
  return pdf.save();
}

function drawElement(
  page: PDFPage,
  element: LabelElement,
  label: PdfLabel,
  placement: PdfPlacement,
  fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont; serifBold: PDFFont },
  barcode: PDFImage | null,
  logo: PDFImage | null,
) {
  const x = mmToPt(placement.offsetXMm + element.x * placement.scale);
  const height = mmToPt(element.height * placement.scale);
  const width = mmToPt(element.width * placement.scale);
  const top = page.getHeight() - mmToPt(placement.offsetYMm + element.y * placement.scale);
  const y = top - height;
  if (element.type === "barcode" && barcode) {
    if (element.rotation === 90 || element.rotation === 270) {
      const clockwise = element.rotation === 270;
      page.drawImage(barcode, {
        x: clockwise ? x : x + width,
        y: clockwise ? y + height : y,
        width: height,
        height: width,
        rotate: degrees(clockwise ? -90 : 90),
      });
      return;
    }
    page.drawImage(barcode, { x, y, width, height, rotate: degrees(element.rotation) });
    return;
  }
  if (element.type === "logo" && logo) {
    page.drawImage(logo, { x, y, width, height });
    return;
  }
  const text = elementText(element, label.content);
  if (!text) return;
  const font = pickFont(element, fonts);
  let size = fittedFontSize(text, element.fontSize, element.width, element.bold, element.autoSize, element.height, element.wrap) * placement.scale;
  let lines = element.wrap ? wrapText(text, font, size, width) : [text];
  while (element.autoSize && size > 3 && blockHeight(size, lines.length) > height) {
    size -= 0.25;
    lines = element.wrap ? wrapText(text, font, size, width) : [text];
  }
  const leading = size * 1.15;
  lines.forEach((line, index) => {
    const baseline = top - size - index * leading;
    if (baseline < y) return;
    const lineWidth = font.widthOfTextAtSize(line, size);
    const aligned =
      element.align === "center" ? x + Math.max(0, (width - lineWidth) / 2) : element.align === "right" ? x + Math.max(0, width - lineWidth) : x;
    page.drawText(line, {
      x: aligned,
      y: baseline,
      size,
      font,
      color: ink,
      rotate: degrees(element.rotation),
    });
  });
}

function blockHeight(size: number, lines: number) {
  return size + Math.max(0, lines - 1) * size * 1.15;
}

function calibrationBarcode(widthMm: number, heightMm: number) {
  const turned = heightMm > widthMm;
  const alongMm = (turned ? heightMm : widthMm) - 6;
  const acrossMm = Math.min(8, (turned ? widthMm : heightMm) - 3);
  const sample = "LE-TEST-001";
  for (let length = sample.length; length >= 1; length -= 1) {
    const text = sample.slice(0, length);
    const check = assessBarcode({ text, format: "code128", widthMm: turned ? acrossMm : alongMm, heightMm: turned ? alongMm : acrossMm, rotation: turned ? 90 : 0 });
    if (check.ok) return text;
  }
  return null;
}

function pickFont(
  element: LabelElement,
  fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont; serifBold: PDFFont },
) {
  if (element.fontFamily === "Georgia") return element.bold ? fonts.serifBold : fonts.serif;
  return element.bold ? fonts.bold : fonts.regular;
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

async function embedLogo(pdf: PDFDocument, logo: string | null) {
  if (!logo?.startsWith("data:image")) return null;
  const base64 = logo.split(",")[1];
  if (!base64) return null;
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (logo.includes("image/png")) return pdf.embedPng(bytes);
  if (logo.includes("image/jpeg") || logo.includes("image/jpg")) return pdf.embedJpg(bytes);
  return null;
}
