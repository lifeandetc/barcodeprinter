"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { act } from "@/lib/browser";
import { PHYSICAL_CHECKS } from "@/lib/hardware";
import { detectDymoPrinters } from "@/lib/printing/dymo-client";
import { downloadPdf } from "@/lib/browser";
import { assessBarcode } from "@/lib/labels/scan";
import { Button, Field, Input, Select } from "@/components/ui";

export function PrinterDesk({ data }: { data: StudioData }) {
  const router = useRouter();
  const preset = data.presets.find((item) => item.isDefault) ?? data.presets[0];
  const [form, setForm] = useState({
    id: preset?.id,
    name: preset?.name ?? "My label stock",
    manufacturer: preset?.manufacturer ?? "DYMO",
    model: preset?.model ?? "LabelWriter 450 Turbo",
    widthMm: preset?.widthMm ?? 12.7,
    heightMm: preset?.heightMm ?? 25.4,
    orientation: preset?.orientation ?? "portrait",
    columns: preset?.columns ?? 2,
    columnGapMm: preset?.columnGapMm ?? 2,
    partNumber: preset?.partNumber ?? "",
    density: preset?.density ?? "barcode",
    offsetXMm: preset?.offsetXMm ?? 0,
    offsetYMm: preset?.offsetYMm ?? 0,
    scale: preset?.scale ?? 1,
    isDefault: true,
  });
  const [printers, setPrinters] = useState<string[]>([]);
  const [status, setStatus] = useState("Not checked");

  function scanNote(widthMm: number, heightMm: number) {
    const turned = heightMm > widthMm;
    const check = assessBarcode({
      text: "LE-BR-GF-001",
      format: "code128",
      widthMm: turned ? Math.min(9, widthMm - 3) : widthMm - 1.6,
      heightMm: turned ? heightMm - 10 : Math.min(6.2, heightMm - 4),
      rotation: turned ? 90 : 0,
    });
    if (check.ok) return "A Code 128 barcode of a typical SKU fits this stock.";
    return `A Code 128 barcode of a SKU such as LE-BR-GF-001 is too long for this stock. ${check.reason} Printing that barcode stays blocked so a bad tag is not sent to the LabelWriter.`;
  }

  function update(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="space-y-3" onSubmit={(event) => {
        event.preventDefault();
        void act("savePreset", form).then((result) => {
          toast.success(result.message || "Label size saved.");
          router.refresh();
        }).catch((error) => toast.error(error.message));
      }}>
        <p className="text-sm leading-6 text-muted">Each sticker is 1/2 × 1 in. The roll feeds two of those stickers side by side, so one printer row prints a pair. The 2 mm gap is the space between them. Measure that white gap and change it if a calibration row does not land on both stickers.</p>
        <p className="text-sm leading-6 text-muted">{scanNote(form.widthMm, form.heightMm)}</p>
        <Field label="Preset name"><Input value={form.name} onChange={(event) => update({ name: event.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Manufacturer"><Input value={form.manufacturer} onChange={(event) => update({ manufacturer: event.target.value })} /></Field>
          <Field label="Model"><Input value={form.model} onChange={(event) => update({ model: event.target.value })} /></Field>
          <Field label="Width mm"><Input type="number" step="0.1" value={form.widthMm} onChange={(event) => update({ widthMm: Number(event.target.value) })} /></Field>
          <Field label="Height mm"><Input type="number" step="0.1" value={form.heightMm} onChange={(event) => update({ heightMm: Number(event.target.value) })} /></Field>
          <Field label="Labels across"><Input type="number" min={1} max={4} step="1" value={form.columns} onChange={(event) => update({ columns: Number(event.target.value) })} /></Field>
          <Field label="Gap mm"><Input type="number" min={0} step="0.1" value={form.columnGapMm} onChange={(event) => update({ columnGapMm: Number(event.target.value) })} /></Field>
        </div>
        <Field label="Orientation">
          <Select value={form.orientation} onChange={(event) => update({ orientation: event.target.value })}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </Select>
        </Field>
        <Field label="Part number"><Input value={form.partNumber ?? ""} onChange={(event) => update({ partNumber: event.target.value })} placeholder="Optional" /></Field>
        <Field label="Print density">
          <Select value={form.density} onChange={(event) => update({ density: event.target.value })}>
            <option value="barcode">Barcode</option>
            <option value="text">Text</option>
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Offset X mm"><Input type="number" step="0.1" value={form.offsetXMm} onChange={(event) => update({ offsetXMm: Number(event.target.value) })} /></Field>
          <Field label="Offset Y mm"><Input type="number" step="0.1" value={form.offsetYMm} onChange={(event) => update({ offsetYMm: Number(event.target.value) })} /></Field>
          <Field label="Scale"><Input type="number" step="0.01" value={form.scale} onChange={(event) => update({ scale: Number(event.target.value) })} /></Field>
        </div>
        <Button>Save printer preset</Button>
      </form>
      <div className="space-y-4">
        <Button variant="outline" onClick={() => {
          detectDymoPrinters().then((found) => {
            setPrinters(found.map((printer) => printer.name));
            setStatus(found.length ? "DYMO Connect responded." : "DYMO Connect responded, but no printer was listed.");
          }).catch((error) => setStatus(error.message));
        }}>Look for DYMO printers</Button>
        <p className="text-sm leading-6">{status}</p>
        <ul className="text-sm">{printers.map((printer) => <li key={printer}>{printer}</li>)}</ul>
        <Button variant="outline" onClick={() => downloadPdf({ kind: "calibration", presetId: form.id }, "life-etc-calibration.pdf").catch((error) => toast.error(error.message))}>Download calibration PDF</Button>
        <p className="text-xs leading-5 text-muted">Print the calibration page at 100% scale. Do not choose “fit to page.” Measure the 10 mm line. A remote site cannot print to the LabelWriter without DYMO Connect running on this Mac.</p>
        <ul className="space-y-2 text-sm text-muted">
          {PHYSICAL_CHECKS.map((check) => <li key={check.id}>{check.label}</li>)}
        </ul>
      </div>
    </div>
  );
}
