"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VariationRow } from "@/lib/catalog/studio";
import { formatMoney, formatQty } from "@/lib/format";
import { Badge, Input, Select } from "@/components/ui";

export function ProductTable({ variations }: { variations: VariationRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState("all");
  const [barcode, setBarcode] = useState("all");
  const [archived, setArchived] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sort, setSort] = useState("name");

  const categories = [...new Set(variations.map((variation) => variation.categoryName || "Uncategorized"))];
  const filtered = useMemo(() => {
    const rows = variations.filter((variation) => {
      if (!archived && variation.isArchived) return false;
      if (archived && !variation.isArchived) return false;
      if (category !== "all" && (variation.categoryName || "Uncategorized") !== category) return false;
      if (barcode === "missing" && variation.barcodeValue) return false;
      if (barcode === "ready" && !variation.barcodeValue) return false;
      if (stock === "out" && !(variation.trackInventory && variation.stock <= 0)) return false;
      if (stock === "low" && !variation.low) return false;
      const haystack = `${variation.itemName} ${variation.variationName} ${variation.sku ?? ""} ${variation.gtin ?? ""}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
    return rows.sort((left, right) => {
      if (sort === "price") return (left.priceAmount ?? -1) - (right.priceAmount ?? -1);
      if (sort === "stock") return left.stock - right.stock;
      return left.itemName.localeCompare(right.itemName);
    });
  }, [archived, barcode, category, query, sort, stock, variations]);
  const visible = filtered.slice(0, 400);

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, SKU, or GTIN" />
        <Select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {categories.map((name) => <option key={name}>{name}</option>)}
        </Select>
        <Select value={stock} onChange={(event) => setStock(event.target.value)}>
          <option value="all">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
        <Select value={barcode} onChange={(event) => setBarcode(event.target.value)}>
          <option value="all">Any barcode</option>
          <option value="missing">Missing barcode</option>
          <option value="ready">Has barcode</option>
        </Select>
        <Select value={sort} onChange={(event) => setSort(event.target.value)}>
          <option value="name">Sort by name</option>
          <option value="price">Sort by price</option>
          <option value="stock">Sort by stock</option>
        </Select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-muted">
          <input type="checkbox" checked={archived} onChange={(event) => setArchived(event.target.checked)} />
          Show archived
        </label>
        <div className="flex gap-2">
          <span className="text-muted">{filtered.length} variations</span>
          <button className="underline disabled:opacity-40" disabled={!selected.some((id) => variations.find((row) => row.id === id)?.barcodeValue)} onClick={() => {
            const ready = selected.filter((id) => variations.find((row) => row.id === id)?.barcodeValue);
            router.push(`/print?ids=${ready.join(",")}`);
          }}>
            Send barcoded items to print queue
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-3" />
              <th className="px-3 py-3">Product</th>
              <th className="px-3 py-3">Variation</th>
              <th className="px-3 py-3">SKU</th>
              <th className="px-3 py-3">Barcode</th>
              <th className="px-3 py-3">Price</th>
              <th className="px-3 py-3">Stock</th>
              <th className="px-3 py-3">Category</th>
              <th className="px-3 py-3">Labels</th>
              <th className="px-3 py-3">Sync</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((variation) => (
              <tr key={variation.id} className="border-b border-line last:border-0">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.includes(variation.id)} onChange={() => toggle(variation.id)} />
                </td>
                <td className="px-3 py-3">
                  <Link href={`/products/${variation.id}`} className="flex items-center gap-3">
                    {variation.imageUrl ? (
                      <img src={variation.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line text-xs">{variation.itemName.slice(0, 1)}</span>
                    )}
                    <span>{variation.itemName}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-muted">{variation.variationName}</td>
                <td className="px-3 py-3">{variation.sku || "—"}</td>
                <td className="px-3 py-3">{variation.barcodeValue ? <Badge tone="ok">Ready</Badge> : <Badge tone="warn">Missing</Badge>}</td>
                <td className="px-3 py-3">{formatMoney(variation.priceAmount, variation.currency)}</td>
                <td className="px-3 py-3">{variation.trackInventory ? formatQty(variation.stock) : "Not tracked"}</td>
                <td className="px-3 py-3">{variation.categoryName || "—"}</td>
                <td className="px-3 py-3">
                  {variation.needsReprint ? <Badge tone="warn">Reprint</Badge> : variation.labelsPrinted ? <Badge>{variation.labelsPrinted} printed</Badge> : <Badge tone="neutral">None</Badge>}
                </td>
                <td className="px-3 py-3 text-muted">{new Date(variation.syncedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > visible.length ? <p className="px-4 py-3 text-sm text-muted">Showing the first 400. Refine the search to see the rest.</p> : null}
        {visible.length === 0 ? <p className="px-4 py-10 text-sm text-muted">No variations match these filters.</p> : null}
      </div>
    </div>
  );
}
