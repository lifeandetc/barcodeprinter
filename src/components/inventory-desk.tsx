"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { act } from "@/lib/browser";
import { formatQty } from "@/lib/format";
import { Button, Field, Input, Select } from "@/components/ui";

export function InventoryDesk({ data }: { data: StudioData }) {
  const router = useRouter();
  const [variationId, setVariationId] = useState(data.variations.find((variation) => variation.trackInventory)?.id ?? "");
  const [locationId, setLocationId] = useState(data.locations[0]?.id ?? "");
  const [reason, setReason] = useState("restock");
  const [quantity, setQuantity] = useState("1");
  const [threshold, setThreshold] = useState(String(data.lowStockDefault));
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("name");
  const [busy, setBusy] = useState(false);
  const categories = useMemo(
    () => [...new Set(data.variations.filter((item) => !item.isArchived).map((item) => item.categoryName || "Uncategorized"))].sort((left, right) => left.localeCompare(right)),
    [data.variations],
  );
  const rows = useMemo(() => {
    const visible = data.variations.filter((item) => !item.isArchived && (category === "all" || (item.categoryName || "Uncategorized") === category));
    return visible.sort((left, right) => {
      if (category === "all") {
        const byCategory = (left.categoryName || "Uncategorized").localeCompare(right.categoryName || "Uncategorized");
        if (byCategory) return byCategory;
      }
      if (sort === "stock") return left.stock - right.stock || left.itemName.localeCompare(right.itemName);
      if (sort === "stock-desc") return right.stock - left.stock || left.itemName.localeCompare(right.itemName);
      return left.itemName.localeCompare(right.itemName) || left.variationName.localeCompare(right.variationName);
    });
  }, [category, data.variations, sort]);
  const variation = rows.find((item) => item.id === variationId) ?? data.variations.find((item) => item.id === variationId);

  useEffect(() => {
    if (!rows.some((item) => item.id === variationId)) setVariationId(rows[0]?.id ?? "");
  }, [rows, variationId]);

  async function submit() {
    if (!confirm("Write this inventory change to Square?")) return;
    setBusy(true);
    try {
      const result = await act("adjustStock", { confirm: true, variationId, locationId, reason, quantity });
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Stock was not changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
    <div className="flex flex-wrap gap-3">
      <Select className="w-56" value={category} onChange={(event) => setCategory(event.target.value)}>
        <option value="all">All categories</option>
        {categories.map((name) => <option key={name}>{name}</option>)}
      </Select>
      <Select className="w-56" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="name">Sort by name</option>
        <option value="stock">Sort by stock, low first</option>
        <option value="stock-desc">Sort by stock, high first</option>
      </Select>
    </div>
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <form className="space-y-3 rounded-lg border border-line bg-card p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <Field label="Variation">
          <Select value={variationId} onChange={(event) => setVariationId(event.target.value)}>
            {rows.map((item) => <option key={item.id} value={item.id}>{item.itemName} · {item.variationName}</option>)}
          </Select>
        </Field>
        <Field label="Location">
          <Select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            {data.locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </Select>
        </Field>
        <Field label="Reason">
          <Select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="restock">Restock</option>
            <option value="damage">Damaged</option>
            <option value="increase">Increase</option>
            <option value="decrease">Decrease</option>
            <option value="count">Physical count</option>
          </Select>
        </Field>
        <Field label="Quantity"><Input value={quantity} onChange={(event) => setQuantity(event.target.value)} /></Field>
        <p className="text-xs leading-5 text-muted">Current stock {variation?.trackInventory ? formatQty(variation.stock) : "not tracked"}. The number in Square is not edited locally.</p>
        <Button disabled={busy || !variationId || !locationId}>Record in Square</Button>
        <Field label="Low-stock default">
          <Input value={threshold} onChange={(event) => setThreshold(event.target.value)} />
        </Field>
        <Button type="button" variant="outline" onClick={() => act("setLowStockDefault", { threshold: Number(threshold) }).then((result) => { toast.success(result.message); router.refresh(); }).catch((error) => toast.error(error.message))}>Save threshold</Button>
      </form>
      <div className="rounded-lg border border-line bg-card">
        <div className="border-b border-line px-4 py-3 text-sm font-medium">Adjustment history</div>
        <div className="divide-y divide-line text-sm">
          {data.adjustments.length === 0 ? <p className="px-4 py-8 text-muted">No stock changes have been recorded here.</p> : null}
          {data.adjustments.map((adjustment) => (
            <div key={adjustment.id} className="grid gap-1 px-4 py-3 md:grid-cols-[1fr_auto_auto]">
              <span>{adjustment.itemName} · {adjustment.reason}</span>
              <span>{adjustment.quantity}</span>
              <span className="text-muted">{adjustment.status}{adjustment.error ? ` · ${adjustment.error}` : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Variation</th>
            <th className="px-4 py-3">Stock</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td className="px-4 py-6 text-muted" colSpan={4}>No products are in this category.</td></tr> : null}
          {rows.map((item) => (
            <tr key={item.id} className={`cursor-pointer border-b border-line last:border-0 ${item.id === variationId ? "bg-background" : ""}`} onClick={() => setVariationId(item.id)}>
              <td className="px-4 py-3">{item.categoryName || "Uncategorized"}</td>
              <td className="px-4 py-3">{item.itemName}</td>
              <td className="px-4 py-3">{item.variationName}</td>
              <td className="px-4 py-3">{item.trackInventory ? formatQty(item.stock) : "Not tracked"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  );
}
