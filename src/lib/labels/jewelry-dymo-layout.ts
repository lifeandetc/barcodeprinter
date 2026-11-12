import { MM_PER_INCH, TWIPS_PER_INCH, mmToTwips } from "@/lib/labels/types";

/** Matches public/labels/jewelry-30299.label — proven scannable in DYMO Connect. */
export function twipsToMm(twips: number) {
  return (twips / TWIPS_PER_INCH) * MM_PER_INCH;
}

export const JEWELRY_30299_BARCODE_MM = {
  x: twipsToMm(100),
  y: twipsToMm(570),
  width: twipsToMm(520),
  height: twipsToMm(520),
} as const;

type JewelryFieldLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  bold?: boolean;
};

/** Text field bounds from jewelry-30299.label (DYMO Connect desktop template). */
export const JEWELRY_DYMO_FIELDS_MM: Record<string, JewelryFieldLayout> = {
  brand: {
    x: twipsToMm(40),
    y: twipsToMm(20),
    width: twipsToMm(640),
    height: twipsToMm(120),
    fontSize: 6,
    bold: true,
  },
  name: {
    x: twipsToMm(40),
    y: twipsToMm(130),
    width: twipsToMm(640),
    height: twipsToMm(420),
    fontSize: 7,
    bold: true,
  },
  sku: {
    x: twipsToMm(40),
    y: twipsToMm(1120),
    width: twipsToMm(640),
    height: twipsToMm(280),
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
