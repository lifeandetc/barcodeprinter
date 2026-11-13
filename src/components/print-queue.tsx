"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { act, downloadPdf } from "@/lib/browser";
import { jewelryScanCheck } from "@/lib/barcodes/fit";
import { assessBarcodeForDymo } from "@/lib/labels/scan";
import { elementsForDymoPrint } from "@/lib/labels/dymo-print-elements";
import { isJewelryLabelSize } from "@/lib/labels/jewelry-dymo-layout";
import { buildJewelryRowXml, jewelryLabelTitle } from "@/lib/labels/dymo-jewelry-open";
import { dymoLabelXml, dymoPrintParams } from "@/lib/labels/dymo-xml";
import { resolveLabelContent } from "@/lib/labels/resolve";
import { isTagged } from "@/lib/catalog/tagged";
import {
  DYMO_NO_PRINTER_HELP,
  detectDymoPrinters,
  pickDymoPrinter,
  printDymoLabel,
  printDymoSanityTest,
  rememberedDymoPrinterName,
} from "@/lib/printing/dymo-client";
import { Button, Field, Input, Select } from "@/components/ui";

/** The Barcode Generator's code, drawn to fit the jewelry tag. */
async function generatorBarcodePng(value: string, format: string) {
  const response = await fetch(`/api/barcodes/image?kind=png&fit=tag&value=${encodeURIComponent(value)}&format=${encodeURIComponent(format)}`);
  if (!response.ok) throw new Error("The barcode from the generator could not be drawn.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function PrintQueue({ data, initialIds }: { data: StudioData; initialIds: string[] }) {
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [material, setMaterial] = useState("all");
  const [locationId, setLocationId] = useState("all");
  const [unprinted, setUnprinted] = useState(false);
  const [templateId, setTemplateId] = useState(data.templates.find((template) => template.isDefault)?.id ?? data.templates[0]?.id ?? "");
  const [presetId, setPresetId] = useState(data.presets.find((preset) => preset.isDefault)?.id ?? data.presets[0]?.id ?? "");
  const printable = useMemo(
    () => data.variations.filter((variation) => !variation.isArchived && variation.barcodeValue),
    [data.variations],
  );
  const [chosen, setChosen] = useState<Record<string, number>>(() => {
    const allowed = new Set(printable.map((variation) => variation.id));
    return Object.fromEntries(initialIds.filter((id) => allowed.has(id)).map((id) => [id, 1]));
  });
  const [busy, setBusy] = useState(false);
  const [dymoPrinters, setDymoPrinters] = useState<string[]>([]);
  const [dymoPrinter, setDymoPrinter] = useState(() => rememberedDymoPrinterName() ?? "");
  const [dymoStatus, setDymoStatus] = useState<string | null>(null);
  const materials = [...new Set(printable.map((variation) => variation.material).filter(Boolean))] as string[];
  const categories = [...new Set(printable.map((variation) => variation.categoryName || "Uncategorized"))].sort((left, right) => left.localeCompare(right));
  const rows = useMemo(() => printable.filter((variation) => {
    if (category !== "all" && (variation.categoryName || "Uncategorized") !== category) return false;
    if (material !== "all" && variation.material !== material) return false;
    if (unprinted && variation.labelsPrinted > 0 && !variation.needsReprint) return false;
    return true;
  }), [category, material, printable, unprinted]);

  function quantityFor(id: string, stock: number) {
    return chosen[id] ?? 0;
  }

  function setQuantity(id: string, quantity: number) {
    setChosen((current) => ({ ...current, [id]: Math.max(0, quantity) }));
  }

  const quantities = rows
    .map((row) => ({ variationId: row.id, quantity: quantityFor(row.id, row.stock) }))
    .filter((row) => row.quantity > 0);
  const total = quantities.reduce((sum, row) => sum + row.quantity, 0);
  const latestJob = data.jobs.find((job) => job.status === "printed") ?? data.jobs[0];
  const latestQuantity = new Map(latestJob?.items.map((item) => [item.variationId, item.quantity]) ?? []);
  const recentIds = new Set(data.jobs.flatMap((job) => job.items.map((item) => item.variationId)));
  const tagChecklist = printable.filter((variation) => {
    if (!recentIds.has(variation.id) || variation.labelsPrinted < 1) return false;
    if (!isTagged(variation)) return true;
    return latestQuantity.has(variation.id);
  });
  const waitingToTag = tagChecklist.filter((variation) => !isTagged(variation));
  const template = data.templates.find((item) => item.id === templateId);
  const preset = data.presets.find((item) => item.id === presetId);

  async function setTagged(variationIds: string[], tagged: boolean) {
    if (!variationIds.length || busy) return;
    setBusy(true);
    try {
      await act("markTagged", { variationIds, tagged });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the tag check.");
    } finally {
      setBusy(false);
    }
  }

  async function record(method: "pdf" | "dymo", status: "exported" | "printed") {
    await act("recordJob", {
      method,
      status,
      templateId,
      presetId,
      items: quantities.map((item) => {
        const variation = data.variations.find((row) => row.id === item.variationId)!;
        return {
          variationId: variation.id,
          quantity: item.quantity,
          encodedValue: variation.barcodeValue || "",
          productName: variation.itemName,
          displayName: variation.displayName || variation.itemName,
        };
      }),
    });
    router.refresh();
  }

  async function exportPdf() {
    setBusy(true);
    try {
      await downloadPdf({ quantities, templateId, presetId }, "life-etc-labels.pdf");
      toast.success("PDF downloaded. It is not marked printed until you confirm.");
      if (confirm("Mark these labels as printed? Downloading a PDF does not prove they printed.")) {
        await record("pdf", "printed");
        toast.success("Print job recorded. Stock was not changed.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "PDF failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refreshDymoPrinters();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the print queue opens
  }, []);

  async function refreshDymoPrinters() {
    setDymoStatus("Looking for DYMO printers…");
    try {
      const printers = await detectDymoPrinters();
      setDymoPrinters(printers.map((printer) => printer.name));
      const choice = pickDymoPrinter(printers, dymoPrinter || rememberedDymoPrinterName());
      if (choice) setDymoPrinter(choice.name);
      setDymoStatus(
        printers.length
          ? `Found ${printers.length} printer${printers.length === 1 ? "" : "s"}.`
          : "DYMO Connect responded, but no printers were listed.",
      );
    } catch (error) {
      setDymoPrinters([]);
      setDymoStatus(error instanceof Error ? error.message : "DYMO lookup failed.");
    }
  }

  async function printDymo() {
    if (!template || !preset || busy) return;
    setBusy(true);
    try {
      const printers = await detectDymoPrinters();
      const printer = pickDymoPrinter(printers, dymoPrinter || rememberedDymoPrinterName());
      if (!printer) throw new Error(DYMO_NO_PRINTER_HELP);
      if (!dymoPrinter) setDymoPrinter(printer.name);
      const flat = quantities.flatMap((item) => {
        const variation = data.variations.find((row) => row.id === item.variationId);
        if (!variation?.barcodeValue) throw new Error("A selected product has no barcode.");
        return Array.from({ length: item.quantity }, () => variation);
      });
      const columns = Math.max(1, preset.columns || 1);
      const orientation = preset.orientation === "portrait" ? "portrait" : "landscape";
      const jewelry = isJewelryLabelSize(preset.widthMm, preset.heightMm);
      const dymoElements = elementsForDymoPrint(template.elements, preset.widthMm, preset.heightMm);
      const barcodeElement = dymoElements.find((element) => element.type === "barcode");
      for (const variation of flat) {
        if (!variation.barcodeValue) continue;
        const check = jewelry
          ? jewelryScanCheck(variation.barcodeValue.trim(), variation.barcodeFormat)
          : assessBarcodeForDymo({
              text: variation.barcodeValue.trim(),
              format: variation.barcodeFormat,
              widthMm: barcodeElement?.width ?? 40,
              heightMm: barcodeElement?.height ?? 12,
              rotation: barcodeElement?.rotation ?? 0,
            });
        if (!check.ok) {
          throw new Error(
            `${variation.displayName || variation.itemName}: ${check.reason ?? "This barcode will not scan."} Open the Barcode Generator and create a code that matches the Square SKU.`,
          );
        }
      }
      if (jewelry) {
        const across = Math.max(1, columns);
        for (let index = 0; index < flat.length; index += across) {
          const row = flat.slice(index, index + across);
          const slots = [];
          for (const variation of row) {
            const code = variation.barcodeValue?.trim() ?? "";
            const format = variation.barcodeFormat || "code128";
            slots.push({
              title: jewelryLabelTitle(resolveLabelContent({ ...variation, logo: data.logo })),
              imageBase64: await generatorBarcodePng(code, format),
            });
          }
          const xml = buildJewelryRowXml({
            slots,
            columns: across,
            gapMm: preset.columnGapMm ?? 2,
            labelWidthMm: preset.widthMm,
            labelHeightMm: preset.heightMm,
          });
          await printDymoLabel(printer.name, xml, dymoPrintParams(1, preset.density, "Auto"), "Auto");
        }
      } else {
        for (let index = 0; index < flat.length; index += columns) {
          const row = flat.slice(index, index + columns);
          const xml = dymoLabelXml({
            widthMm: preset.widthMm,
            heightMm: preset.heightMm,
            orientation,
            columnCount: columns,
            columnGapMm: preset.columnGapMm,
            elements: dymoElements,
            content: resolveLabelContent({ ...row[0], logo: data.logo }),
            format: row[0].barcodeFormat,
            slots: row.map((variation) => ({
              elements: dymoElements,
              content: resolveLabelContent({ ...variation, logo: data.logo }),
              format: variation.barcodeFormat,
            })),
          });
          await printDymoLabel(printer.name, xml, dymoPrintParams(1, preset.density, "Auto"), "Auto");
        }
      }
      await record("dymo", "printed");
      const rowNote = columns > 1 ? ` (${Math.ceil(flat.length / columns)} row${Math.ceil(flat.length / columns) === 1 ? "" : "s"}, ${columns} across)` : "";
      toast.success(`Sent ${total} labels to ${printer.name}${rowNote}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "DYMO printing failed.");
    } finally {
      setBusy(false);
    }
  }

  const dymoReady = Boolean(dymoPrinter && dymoPrinters.includes(dymoPrinter));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-card px-4 py-4 text-sm leading-6">
        <p className="font-medium">Print straight to your DYMO from this studio</p>
        <p className="mt-1 text-muted">
          Yes—when DYMO Connect is running on <span className="text-ink">this Mac</span> with the LabelWriter plugged in, you can print from{" "}
          <span className="text-ink">Print queue</span> or after creating barcodes. The site talks to DYMO on your computer; nothing prints from the cloud by itself.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
          <li>Install and open DYMO Connect. Confirm the 450 appears in DYMO Connect.</li>
          <li>In Chrome, allow <span className="text-ink">Local network access</span> for this site (lock icon in the address bar).</li>
          <li>Click <span className="text-ink">Look for DYMO printers</span> below and choose your printer.</li>
          <li>
            Set quantities, then <span className="text-ink">Print with DYMO</span>. Jewelry still prints two tags side by side. Each tag shows the product name and the same barcode as the Barcode Generator, kept fully on the sticker. Use{" "}
            <span className="text-ink">Export PDF</span> if you prefer Preview.
          </li>
        </ol>
        <p className="mt-3 text-muted">
          <Link href="/settings/printer" className="underline decoration-line underline-offset-4">
            Printer setup
          </Link>
          {" · "}
          <Link href="/settings/labels" className="underline decoration-line underline-offset-4">
            Label sizes
          </Link>
          {dymoReady ? <span className="text-ok"> · Ready: {dymoPrinter}</span> : null}
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </Select>
        <Select value={material} onChange={(event) => setMaterial(event.target.value)}>
          <option value="all">All materials</option>
          {materials.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
          <option value="all">All locations</option>
          {data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={unprinted} onChange={(event) => setUnprinted(event.target.checked)} /> Only products without recorded labels</label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Template"><Select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></Field>
        <Field label="Label stock"><Select value={presetId} onChange={(event) => setPresetId(event.target.value)}>{data.presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name} · {preset.widthMm}×{preset.heightMm} mm</option>)}</Select></Field>
      </div>
      <div className="rounded-lg border border-line bg-card px-4 py-3 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
          <Field label="DYMO printer">
            <Select value={dymoPrinter} onChange={(event) => setDymoPrinter(event.target.value)}>
              <option value="">Choose a printer…</option>
              {dymoPrinters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void refreshDymoPrinters()}>
            Look for DYMO printers
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy || !dymoPrinter}
            onClick={() => {
              setBusy(true);
              void detectDymoPrinters()
                .then((printers) => {
                  const printer = pickDymoPrinter(printers, dymoPrinter);
                  if (!printer) throw new Error(DYMO_NO_PRINTER_HELP);
                  return printDymoSanityTest(printer.name);
                })
                .then(() => toast.success("Sent a test label to the DYMO. Check whether paper fed."))
                .catch((error) => toast.error(error instanceof Error ? error.message : "Test print failed."))
                .finally(() => setBusy(false));
            }}
          >
            Print test label
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          Jewelry tags print two across. Each one shows the product name and the same barcode as the Barcode Generator. DYMO Connect must be running on this Mac; allow{" "}
          <span className="font-medium">Local network access</span> for this site.
          {dymoStatus ? ` ${dymoStatus}` : " Click Look for DYMO printers, choose a printer, then try Print test label."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setChosen(Object.fromEntries(rows.map((row) => [row.id, locationId === "all" ? Math.max(0, Math.round(row.stock)) : Math.max(0, Math.round(row.stockByLocation.find((location) => location.locationId === locationId)?.quantity ?? 0))])))}>One label per unit in stock</Button>
        <Button variant="ghost" onClick={() => setChosen({})}>Clear quantities</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">In stock</th>
              <th className="px-4 py-3">Labels to print</th>
              <th className="px-4 py-3">Recorded prints</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={4}>
                  {printable.length === 0
                    ? "No barcodes have been created yet. Create them in the Barcode Generator before printing."
                    : "No barcoded products match these filters."}
                </td>
              </tr>
            ) : null}
            {rows.map((row) => {
              const stock = locationId === "all" ? row.stock : row.stockByLocation.find((location) => location.locationId === locationId)?.quantity ?? 0;
              return (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{row.displayName || row.itemName}<div className="text-muted">{row.variationName}</div></td>
                  <td className="px-4 py-3">{row.trackInventory ? stock : "—"}</td>
                  <td className="px-4 py-3"><Input className="w-24" type="number" min={0} value={quantityFor(row.id, stock)} onChange={(event) => setQuantity(row.id, Number(event.target.value))} /></td>
                  <td className="px-4 py-3 text-muted">{row.labelsPrinted}{row.needsReprint ? " · reprint price" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">Total: {total} labels{(preset?.columns ?? 1) > 1 ? `, ${Math.ceil(total / (preset?.columns || 1))} printer rows with ${preset?.columns} stickers each` : ""}. This does not change inventory.</div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy || total === 0} onClick={exportPdf}>Export PDF</Button>
          <Button disabled={busy || total === 0} onClick={printDymo}>Print with DYMO</Button>
        </div>
      </div>
      <div className="rounded-lg border border-line bg-card px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium">Tagged</h2>
            <p className="mt-1 text-sm leading-6 text-muted">After the labels print, check off each product once those pieces have a tag on them. A new print clears the check.</p>
          </div>
          <Button type="button" variant="outline" disabled={busy || waitingToTag.length === 0} onClick={() => void setTagged(waitingToTag.map((variation) => variation.id), true)}>
            Check off all
          </Button>
        </div>
        {tagChecklist.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Nothing is waiting. Printed products you have not checked off will show up here.</p>
        ) : (
          <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
            {tagChecklist.map((variation) => {
              const printed = latestQuantity.get(variation.id);
              const tagged = isTagged(variation);
              return (
                <li key={variation.id} className="flex items-start gap-3 rounded-md border border-line px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    aria-label={`Tagged ${variation.displayName || variation.itemName}`}
                    disabled={busy}
                    checked={tagged}
                    onChange={() => void setTagged([variation.id], !tagged)}
                  />
                  <div>
                    <div>{variation.displayName || variation.itemName}</div>
                    <div className="text-muted">
                      {variation.variationName}
                      {printed ? ` · ${printed} in the last print` : ` · ${variation.labelsPrinted} labels recorded`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <h2 className="text-sm font-medium">Recent jobs</h2>
        <div className="mt-3 space-y-2 text-sm">
          {data.jobs.length === 0 ? <p className="text-muted">No print jobs yet.</p> : null}
          {data.jobs.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
              <span>{job.totalLabels} labels · {job.method} · {job.status}</span>
              <button className="underline" onClick={() => {
                const allowed = new Set(printable.map((variation) => variation.id));
                setChosen(Object.fromEntries(job.items.filter((item) => allowed.has(item.variationId)).map((item) => [item.variationId, item.quantity])));
              }}>Load quantities</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
