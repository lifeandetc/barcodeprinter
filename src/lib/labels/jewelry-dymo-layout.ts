import { MM_PER_INCH, TWIPS_PER_INCH, mmToTwips } from "@/lib/labels/types";

/** ½×1 in jewelry stock. The barcode runs along the 1 in side so the bars stay wide enough to scan. */
export function twipsToMm(twips: number) {
  return (twips / TWIPS_PER_INCH) * MM_PER_INCH;
}

export const JEWELRY_30299_BARCODE_MM = {
  x: twipsToMm(150),
  y: twipsToMm(250),
  width: twipsToMm(420),
  height: twipsToMm(1080),
} as const;

type JewelryFieldLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  bold?: boolean;
};

/** Text sits above and below the tall barcode so it does not cover the bars. */
export const JEWELRY_DYMO_FIELDS_MM: Record<string, JewelryFieldLayout> = {
  brand: {
    x: twipsToMm(40),
    y: twipsToMm(12),
    width: twipsToMm(640),
    height: twipsToMm(80),
    fontSize: 6,
    bold: true,
  },
  name: {
    x: twipsToMm(40),
    y: twipsToMm(100),
    width: twipsToMm(640),
    height: twipsToMm(140),
    fontSize: 7,
    bold: true,
  },
  sku: {
    x: twipsToMm(40),
    y: twipsToMm(1340),
    width: twipsToMm(640),
    height: twipsToMm(90),
    fontSize: 5,
    bold: false,
  },
};

export function isJewelryLabelSize(widthMm: number, heightMm: number) {
  return Math.abs(widthMm - 12.7) < 0.2 && Math.abs(heightMm - 25.4) < 0.2;
}

/** One die-cut outline per sticker on a two-across Twin Turbo row. */
export function jewelryRowDrawCommands(labelWidthMm: number, labelHeightMm: number, columns: number, gapMm: number) {
  const cellW = mmToTwips(labelWidthMm);
  const h = mmToTwips(labelHeightMm);
  const gap = mmToTwips(gapMm);
  const count = Math.max(1, Math.round(columns));
  const rects = Array.from({ length: count }, (_, index) => {
    const x = index * (cellW + gap);
    return `<RoundRectangle X="${x}" Y="0" Width="${cellW}" Height="${h}" Rx="270" Ry="270"> </RoundRectangle>`;
  });
  return `<DrawCommands>\n${rects.join("\n")}\n</DrawCommands>`;
}

export function jewelrySingleDrawCommands(labelWidthMm: number, labelHeightMm: number) {
  return jewelryRowDrawCommands(labelWidthMm, labelHeightMm, 1, 0);
}
