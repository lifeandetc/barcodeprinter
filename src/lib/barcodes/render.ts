import bwipjs from "bwip-js/node";
import { assertFormatAccepts } from "@/lib/barcodes/select";

const BCID: Record<string, string> = {
  code128: "code128",
  code39: "code39",
  ean13: "ean13",
  upca: "upca",
  qrcode: "qrcode",
};

function options(value: string, format: string, heightMm: number) {
  assertFormatAccepts(format, value);
  const bcid = BCID[format];
  if (!bcid) throw new Error("Choose a supported barcode format.");
  return {
    bcid,
    text: format === "code39" ? value.toUpperCase() : value,
    height: Math.max(6, heightMm),
    scale: 4,
    includetext: false,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
    paddingwidth: format === "qrcode" ? 4 : 12,
    paddingheight: format === "qrcode" ? 4 : 6,
    monochrome: true,
  };
}

export async function barcodePng(value: string, format: string, heightMm = 12) {
  return bwipjs.toBuffer(options(value, format, heightMm));
}

/** LabelWriter 450 prints at 300 dpi. The tag's long side is 300 dots. Bars must use a whole number of those dots. */
const TAG_LENGTH_DOTS = 300;
const BAR_HEIGHT_DOTS = 90;

function chooseJewelryDots(modules: number) {
  const limit = TAG_LENGTH_DOTS - 8;
  for (const scale of [3, 2]) {
    for (const quiet of [10, 8, 6, 4]) {
      if (modules * scale + quiet * scale * 2 <= limit) return { scale, quiet };
    }
  }
  const scale = 2;
  const quiet = Math.max(4, Math.floor((limit - modules * scale) / (scale * 2)));
  return { scale, quiet };
}

/**
 * Code 128 of the Square SKU, sized for a 1/2 × 1 in tag.
 * The picture is already turned so the bars run along the long side, at 300 dpi, with no extra scaling.
 */
export async function jewelryBarcodePng(value: string, format: string) {
  assertFormatAccepts(format, value);
  const bcid = BCID[format];
  if (!bcid) throw new Error("Choose a supported barcode format.");
  if (format === "qrcode") return barcodePng(value, format, 8);
  const text = format === "code39" ? value.toUpperCase() : value;
  const probe = await bwipjs.toBuffer({
    bcid,
    text,
    scale: 1,
    height: 5,
    includetext: false,
    padding: 0,
    monochrome: true,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
  });
  const modules = probe.readUInt32BE(16);
  const { scale, quiet } = chooseJewelryDots(modules);
  const heightMm = BAR_HEIGHT_DOTS / ((72 / 25.4) * scale);
  return bwipjs.toBuffer({
    bcid,
    text,
    scaleX: scale,
    scaleY: scale,
    height: heightMm,
    includetext: false,
    paddingwidth: quiet,
    paddingheight: 0,
    monochrome: true,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
    rotate: "R",
  });
}

/** Same code the Barcode Generator shows, turned to run along a 1 in tag. */
export async function tagBarcodePng(value: string, format: string) {
  assertFormatAccepts(format, value);
  const bcid = BCID[format];
  if (!bcid) throw new Error("Choose a supported barcode format.");
  if (format === "qrcode") return barcodePng(value, format, 8);
  return bwipjs.toBuffer({
    bcid,
    text: format === "code39" ? value.toUpperCase() : value,
    scale: 2,
    height: 14,
    includetext: false,
    paddingwidth: 10,
    paddingheight: 1,
    monochrome: true,
    backgroundcolor: "FFFFFF",
    barcolor: "000000",
    rotate: "R",
  });
}

export function barcodeSvg(value: string, format: string, heightMm = 12) {
  return bwipjs.toSVG(options(value, format, heightMm));
}
