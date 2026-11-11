"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData, VariationRow } from "@/lib/catalog/studio";
import { BARCODE_FORMATS } from "@/lib/barcodes/select";
import { suggestSku } from "@/lib/barcodes/sku";
import { act } from "@/lib/browser";
import { formatMoney, formatQty } from "@/lib/format";
import { LabelPreview } from "@/components/label-preview";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/ui";

export function ProductDetail({ data, variation }: { data: StudioData; variation: VariationRow }) {
  const router = useRouter();
  const template = data.templates.find((item) => item.id === variation.templateId) ?? data.templates.find((item) => item.isDefault) ?? data.templates[0];
  const [displayName, setDisplayName] = useState(variation.displayName ?? "");
  const [material, setMaterial] = useState(variation.material ?? "");
  const [customText, setCustomText] = useState(variation.customText ?? "");
  const [details, setDetails] = useState(variation.details ?? "");
  const [showPrice, setShowPrice] = useState(variation.showPrice);
  const [sku, setSku] = useState(variation.sku ?? "");
  const [source, setSource] = useState(variation.barcodeSource ?? "sku");
  const [format, setFormat] = useState(variation.barcodeFormat || "code128");
  const [price, setPrice] = useState(variation.priceAmount != null ? (variation.priceAmount / 100).toFixed(2) : "");
  const [name, setName] = useState(variation.itemName);
  const [description, setDescription] = useState(variation.description);
  const [busy, setBusy] = useState(false);

  async function run(action: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const result = await act(action, body);
      toast.success(result.message || "Saved.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That did not save.");
    } finally {
      setBusy(false);
    }
  }

  const content = {
    ...variation,
    displayName,
    material,
    customText,
    details,
    showPrice,
    barcodeValue: variation.barcodeValue,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1fr_0.9fr]">
      <section className="space-y-4 rounded-lg border border-line bg-card p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Square</div>
        {variation.imageUrl ? <img src={variation.imageUrl} alt="" className="aspect-square w-full rounded-md object-cover" /> : <div className="flex aspect-square items-center justify-center rounded-md border border-line font-display text-4xl">{variation.itemName.slice(0, 1)}</div>}
        <Field label="Product name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="Description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
        <p className="text-xs leading-5 text-muted">Variation id {variation.id}. This is the key used to match Square, not the product name.</p>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run("updateItem", { confirm: true, itemId: variation.itemId, name, description })}>Save catalog text</Button>
          <Button variant="danger" disabled={busy} onClick={() => {
            if (confirm("Archive this product in Square?")) void run("updateItem", { confirm: true, itemId: variation.itemId, archive: true });
          }}>Archive</Button>
        </div>
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{variation.variationName}</h2>
          {variation.needsReprint ? <Badge tone="warn">Printed price may be stale</Badge> : null}
        </div>
        <p className="text-2xl">{formatMoney(variation.priceAmount, variation.currency)}</p>
        <Field label="New price">
          <Input value={price} onChange={(event) => setPrice(event.target.value)} />
        </Field>
        <Button variant="outline" disabled={busy} onClick={() => {
          const cents = Math.round(Number(price) * 100);
          if (!confirm("Publish this price to Square?")) return;
          void run("publishPrices", { confirm: true, changes: [{ variationId: variation.id, amount: cents }] });
        }}>Publish price</Button>
        <Field label="SKU">
          <Input value={sku} onChange={(event) => setSku(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setSku(suggestSku({ itemName: variation.itemName, variationName: variation.variationName, material }, data.variations.map((item) => item.sku || "")))}>Suggest SKU</Button>
          <Button disabled={busy} onClick={() => {
            if (!confirm("Save this SKU to Square? The GTIN will not be changed.")) return;
            void run("updateSku", { confirm: true, variationId: variation.id, sku });
          }}>Save SKU</Button>
        </div>
        <p className="text-sm text-muted">GTIN {variation.gtin || "none on this variation"}</p>
        <p className="text-sm">Stock {variation.trackInventory ? formatQty(variation.stock) : "not tracked"} · {variation.categoryName || "No category"}</p>
        {!variation.trackInventory ? <Button variant="outline" disabled={busy} onClick={() => confirm("Turn on Square inventory tracking?") && run("enableTracking", { confirm: true, variationId: variation.id })}>Track inventory</Button> : null}
        <Field label="Barcode source">
          <Select value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="sku">SKU</option>
            <option value="gtin">GTIN</option>
          </Select>
        </Field>
        <Field label="Format">
          <Select value={format} onChange={(event) => setFormat(event.target.value)}>
            {BARCODE_FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
        </Field>
        <Button disabled={busy} onClick={() => run("saveBarcode", { variationId: variation.id, source, format, regenerate: true })}>Save barcode</Button>
        {!data.verification ? <p className="text-xs leading-5 text-muted">This format is not marked Square-compatible until a checkout scan succeeds.</p> : <p className="text-xs leading-5 text-ok">Verified with your hardware: {data.verification.format} / {data.verification.identifierField}</p>}
      </section>
      <section className="space-y-4 rounded-lg border border-line bg-card p-5">
        <div className="text-[11px] uppercase tracking-[0.16em] text-muted">Label only</div>
        {template ? <LabelPreview template={template} variation={content} logo={data.logo} /> : <p className="text-sm text-muted">Save a template first.</p>}
        <Field label="Name on the tag"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder={variation.itemName} /></Field>
        <Field label="Material"><Input value={material} onChange={(event) => setMaterial(event.target.value)} /></Field>
        <Field label="Custom text"><Input value={customText} onChange={(event) => setCustomText(event.target.value)} /></Field>
        <Field label="Details"><Textarea value={details} onChange={(event) => setDetails(event.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={showPrice} onChange={(event) => setShowPrice(event.target.checked)} />
          Print the current Square price
        </label>
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => run("saveLabel", { variationId: variation.id, displayName, material, customText, details, showPrice, templateId: template?.id })}>Save label text</Button>
          {variation.needsReprint ? <Button variant="outline" disabled={busy} onClick={() => run("saveLabel", { variationId: variation.id, displayName, material, customText, details, showPrice, dismissReprint: true, templateId: template?.id })}>Dismiss reprint warning</Button> : null}
        </div>
        <p className="text-xs leading-5 text-muted">{variation.labelsPrinted} labels recorded. Recorded prints are not the same as units in stock.</p>
      </section>
    </div>
  );
}
