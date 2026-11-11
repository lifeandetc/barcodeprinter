"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { BARCODE_FORMATS } from "@/lib/barcodes/select";
import { suggestSku } from "@/lib/barcodes/sku";
import { act } from "@/lib/browser";
import { Button, Select } from "@/components/ui";

export function BarcodeDesk({ data }: { data: StudioData }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState(data.verification?.format ?? "code128");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("category");
  const [busy, setBusy] = useState(false);
  const categories = useMemo(
    () => [...new Set(data.variations.filter((variation) => !variation.isArchived).map((variation) => variation.categoryName || "Uncategorized"))].sort((left, right) => left.localeCompare(right)),
    [data.variations],
  );
  const rows = useMemo(() => {
    const visible = data.variations.filter((variation) => {
      if (variation.isArchived) return false;
      return category === "all" || (variation.categoryName || "Uncategorized") === category;
    });
    return visible.sort((left, right) => {
      if (sort === "name") return left.itemName.localeCompare(right.itemName);
      const byCategory = (left.categoryName || "Uncategorized").localeCompare(right.categoryName || "Uncategorized");
      return byCategory || left.itemName.localeCompare(right.itemName);
    });
  }, [category, data.variations, sort]);
  const missing = rows.filter((variation) => !variation.barcodeValue);

  async function createBarcodes() {
    setBusy(true);
    try {
      const rows = data.variations.filter((variation) => selected.includes(variation.id));
      for (const variation of rows) {
        let sku = variation.sku;
        if (!sku) {
          sku = suggestSku(
            { itemName: variation.itemName, variationName: variation.variationName, material: variation.material },
            data.variations.map((item) => item.sku || ""),
          );
          if (!confirm(`Save generated SKU ${sku} for ${variation.itemName}?`)) continue;
          await act("updateSku", { confirm: true, variationId: variation.id, sku });
        }
        await act("saveBarcode", { variationId: variation.id, source: "sku", format, regenerate: false });
      }
      toast.success("Barcodes saved in Life & Etc. Existing barcodes were left alone.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Barcode creation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm leading-6 text-muted">
        Code 128 is the default. {data.verification ? `Your last successful checkout test used ${data.verification.format} on the ${data.verification.identifierField}.` : "No format is marked Square-compatible until you scan a sample at checkout."} A title or price change does not regenerate a barcode.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Select className="w-48" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </Select>
        <Select className="w-48" value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="category">Sort by category</option>
          <option value="name">Sort by name</option>
        </Select>
        <Select className="w-48" value={format} onChange={(event) => setFormat(event.target.value)}>
          {BARCODE_FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Button disabled={busy || !selected.length} onClick={createBarcodes}>Create barcodes for {selected.length || "selected"}</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-line"><th className="px-4 py-3" /><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">GTIN</th><th className="px-4 py-3">Encoded value</th></tr>
          </thead>
          <tbody>
            {rows.map((variation) => (
              <tr key={variation.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><input type="checkbox" disabled={Boolean(variation.barcodeValue)} checked={selected.includes(variation.id)} onChange={() => setSelected((current) => current.includes(variation.id) ? current.filter((id) => id !== variation.id) : [...current, variation.id])} /></td>
                <td className="px-4 py-3">{variation.itemName}</td>
                <td className="px-4 py-3">{variation.categoryName || "Uncategorized"}</td>
                <td className="px-4 py-3">{variation.sku || "Missing"}</td>
                <td className="px-4 py-3">{variation.gtin || "—"}</td>
                <td className="px-4 py-3">{variation.barcodeValue || "Not created"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">{missing.length} variations in this view have no barcode. Download a single code from a product page, or print from the queue.</p>
      <div className="flex gap-3 text-sm">
        <a className="underline" href="/settings/barcode-test">Open the compatibility test</a>
      </div>
    </div>
  );
}
