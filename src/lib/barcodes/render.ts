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
    paddingwidth: format === "qrcode" ? 2 : 10,
    paddingheight: 2,
    monochrome: true,
  };
}

export async function barcodePng(value: string, format: string, heightMm = 12) {
  return bwipjs.toBuffer(options(value, format, heightMm));
}

export function barcodeSvg(value: string, format: string, heightMm = 12) {
  return bwipjs.toSVG(options(value, format, heightMm));
}
