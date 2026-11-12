import { MM_PER_INCH, TWIPS_PER_INCH } from "@/lib/labels/types";

/** Matches public/labels/jewelry-30299.label — proven scannable in DYMO Connect. */
function twipsToMm(twips: number) {
  return (twips / TWIPS_PER_INCH) * MM_PER_INCH;
}

export const JEWELRY_30299_BARCODE_MM = {
  x: twipsToMm(100),
  y: twipsToMm(570),
  width: twipsToMm(520),
  height: twipsToMm(520),
} as const;

export function isJewelryLabelSize(widthMm: number, heightMm: number) {
  return Math.abs(widthMm - 12.7) < 0.2 && Math.abs(heightMm - 25.4) < 0.2;
}

/** Twin Turbo jewelry stock: one physical sticker per job, alternating rolls — not one wide combined label. */
export function dymoJewelryTwinTurboAlternateJobs(widthMm: number, heightMm: number, columns: number) {
  return columns > 1 && isJewelryLabelSize(widthMm, heightMm);
}
