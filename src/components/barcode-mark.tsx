export function BarcodeMark({ value, format, label }: { value: string; format: string; label: string }) {
  const src = `/api/barcodes/image?kind=png&value=${encodeURIComponent(value)}&format=${encodeURIComponent(format)}&height=18`;
  return (
    <div className="inline-flex max-w-full flex-col items-center gap-1 rounded-md bg-white px-4 py-3">
      <img src={src} alt={label} className="h-24 w-auto max-w-full" style={{ imageRendering: "crisp-edges" }} />
      <span className="font-mono text-[11px] tracking-[0.14em] text-ink">{value}</span>
    </div>
  );
}
