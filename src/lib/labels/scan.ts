export function code128Modules(text: string) {
  return 11 * Math.max(text.length, 1) + 35;
}

export function assessBarcode(input: {
  text: string;
  format: string;
  widthMm: number;
  heightMm: number;
  rotation?: number;
}) {
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
  const quietMm = 5;
  const modules = input.format === "code39" ? input.text.length * 16 + 30 : code128Modules(input.text);
  const drawable = alongMm - quietMm;
  const moduleMm = drawable / modules;
  if (acrossMm < 6) {
    return { ok: false, moduleMm, reason: "Barcode height is under 6 mm, which is too short to scan reliably." };
  }
  if (drawable <= 0 || moduleMm < 0.25) {
    return {
      ok: false,
      moduleMm,
      reason: `The bars would be about ${Math.max(moduleMm, 0).toFixed(3)} mm wide. Keep them at least 0.25 mm, including quiet space.`,
    };
  }
  return { ok: true, moduleMm };
}
