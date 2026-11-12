export function code128Modules(text: string) {
  return 11 * Math.max(text.length, 1) + 35;
}

export type AssessBarcodeInput = {
  text: string;
  format: string;
  widthMm: number;
  heightMm: number;
  rotation?: number;
  /** Quiet margin along the bar direction; PDF export uses a generous default. */
  quietMm?: number;
  /** Minimum acceptable module width; DYMO auto-sizes inside Bounds and can go smaller. */
  minModuleMm?: number;
  /** Minimum bar height (across the bars). */
  minAcrossMm?: number;
};

export function assessBarcode(input: AssessBarcodeInput) {
  const turned = input.rotation === 90 || input.rotation === 270;
  const alongMm = turned ? input.heightMm : input.widthMm;
  const acrossMm = turned ? input.widthMm : input.heightMm;
  if (!input.text.trim()) {
    return { ok: false, reason: "This label has no barcode value yet.", moduleMm: 0 };
  }
  if (input.format === "qrcode") {
    const ok = input.widthMm >= 12 && input.heightMm >= 12;
    return {
      ok,
      moduleMm: Math.min(input.widthMm, input.heightMm) / 25,
      reason: ok ? undefined : "A QR code on this label would be under 12 mm. That is too small to trust.",
    };
  }
  const quietMm = input.quietMm ?? 5;
  const minModuleMm = input.minModuleMm ?? 0.25;
  const minAcrossMm = input.minAcrossMm ?? 6;
  const modules = input.format === "code39" ? input.text.length * 16 + 30 : code128Modules(input.text);
  const drawable = alongMm - quietMm;
  const moduleMm = modules > 0 ? drawable / modules : 0;
  if (acrossMm < minAcrossMm) {
    return {
      ok: false,
      moduleMm,
      reason: `Barcode height is under ${minAcrossMm} mm, which is too short to scan reliably.`,
    };
  }
  if (drawable <= 0 || moduleMm < minModuleMm) {
    return {
      ok: false,
      moduleMm,
      reason: `The bars would be about ${Math.max(moduleMm, 0).toFixed(3)} mm wide. Keep them at least ${minModuleMm} mm, including quiet space.`,
    };
  }
  return { ok: true, moduleMm };
}

/** DYMO fits Code128 inside object bounds; jewelry tags need a smaller quiet + module threshold than PDF. */
export function assessBarcodeForDymo(
  input: Omit<AssessBarcodeInput, "quietMm" | "minModuleMm" | "minAcrossMm" | "rotation">,
) {
  return assessBarcode({
    ...input,
    rotation: 0,
    quietMm: 2,
    minModuleMm: 0.05,
    minAcrossMm: 5,
  });
}
