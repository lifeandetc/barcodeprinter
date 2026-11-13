"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { planBarcode, reservedCodes, sharedVariationIds, type BarcodePlan } from "@/lib/barcodes/fit";
import { specificVariation } from "@/lib/labels/resolve";
import { BARCODE_FORMATS } from "@/lib/barcodes/select";
import { act } from "@/lib/browser";
import { BarcodeMark } from "@/components/barcode-mark";
import { Badge, Button, Select } from "@/components/ui";

const STATUS: Record<BarcodePlan["action"], { label: string; tone: "ok" | "warn" | "danger" }> = {
  ready: { label: "Ready to print", tone: "ok" },
  "encode-sku": { label: "Preview matches Square SKU", tone: "warn" },
  "encode-gtin": { label: "Preview matches Square GTIN", tone: "warn" },
  "replace-sku": { label: "Needs a short Square SKU", tone: "warn" },
  blocked: { label: "Will not scan", tone: "danger" },
};

export function BarcodeDesk({ data }: { data: StudioData }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState(data.verification?.format && data.verification.format !== "qrcode" ? data.verification.format : "code128");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("category");
  const [busy, setBusy] = useState(false);
  const categories = useMemo(
    () => [...new Set(data.variations.filter((variation) => !variation.isArchived).map((variation) => variation.categoryName || "Uncategorized"))].sort((left, right) => left.localeCompare(right)),
    [data.variations],
  );
  const plans = useMemo(() => {
    const reserved = reservedCodes(data.variations);
    const skuShared = sharedVariationIds(data.variations, (variation) => variation.sku);
    const barcodeShared = sharedVariationIds(data.variations, (variation) => variation.barcodeValue);
    const gtinShared = sharedVariationIds(data.variations, (variation) => variation.gtin);
    const map = new Map<string, BarcodePlan>();
    for (const variation of data.variations) {
      map.set(
        variation.id,
        planBarcode(variation, format, reserved, {
          skuShared: skuShared.has(variation.id),
          barcodeShared: barcodeShared.has(variation.id),
          gtinShared: gtinShared.has(variation.id),
        }),
      );
    }
    return map;
  }, [data.variations, format]);
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
  const needsWork = rows.filter((variation) => {
    const action = plans.get(variation.id)?.action;
    return action === "encode-sku" || action === "encode-gtin" || action === "replace-sku";
  });

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function createBarcodes() {
    const chosen = rows.filter((variation) => selected.includes(variation.id));
    const work = chosen.flatMap((variation) => {
      const plan = plans.get(variation.id);
      if (!plan || plan.action === "ready" || plan.action === "blocked") return [];
      return [{ variation, plan }];
    });
    if (!work.length) {
      toast.success(chosen.length ? "Those barcodes are already saved and match Square." : "Select a product first.");
      return;
    }
    const replacements = work.filter((item) => item.plan.action === "replace-sku");
    if (replacements.length) {
      const lines = replacements
        .map((item) => {
          const color = specificVariation(item.variation.variationName);
          const name = color ? `${item.variation.itemName} · ${color}` : item.variation.itemName;
          return `${name}: ${item.plan.previousSku || "no SKU"} → ${item.plan.value}`;
        })
        .join("\n");
      const accepted = confirm(
        `Each variation needs its own barcode so a scan adds that color, not just the product. Square will save the new SKU on that variation.\n\n${lines}`,
      );
      if (!accepted) return;
    }
    setBusy(true);
    try {
      for (const item of work) {
        if (item.plan.action === "replace-sku") {
          await act("updateSku", { confirm: true, variationId: item.variation.id, sku: item.plan.value });
        }
        await act("saveBarcode", {
          variationId: item.variation.id,
          source: item.plan.action === "encode-gtin" ? "gtin" : "sku",
          format: item.plan.format,
          regenerate: true,
        });
      }
      toast.success("Barcodes are saved. Scan one on this page, then print.");
      setSelected([]);
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
        Each variation, such as a color, gets its own barcode. A scan adds that variation in Square instead of asking you to pick one. If several colors share a SKU, each one is given a short code and that code is saved on its Square variation. The tag shows the color too.
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
        <Button variant="outline" disabled={!needsWork.length} onClick={() => setSelected(needsWork.map((variation) => variation.id))}>
          Select {needsWork.length} to generate
        </Button>
        <Button disabled={busy || !selected.length} onClick={createBarcodes}>Generate barcodes for {selected.length || "selected"}</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-line bg-card">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr className="border-b border-line">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all visible products"
                  checked={rows.some((variation) => plans.get(variation.id)?.action !== "blocked") && rows.filter((variation) => plans.get(variation.id)?.action !== "blocked").every((variation) => selected.includes(variation.id))}
                  onChange={() => {
                    const selectable = rows.filter((variation) => plans.get(variation.id)?.action !== "blocked").map((variation) => variation.id);
                    setSelected((current) => (selectable.every((id) => current.includes(id)) ? current.filter((id) => !selectable.includes(id)) : [...new Set([...current, ...selectable])]));
                  }}
                />
              </th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Square</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3">Check</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((variation) => {
              const plan = plans.get(variation.id);
              const status = plan ? STATUS[plan.action] : STATUS.blocked;
              const blocked = plan?.action === "blocked";
              return (
                <tr key={variation.id} className="border-b border-line align-top last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${variation.itemName}`}
                      disabled={blocked}
                      checked={selected.includes(variation.id)}
                      onChange={() => toggle(variation.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>{variation.itemName}</div>
                    <div>{specificVariation(variation.variationName) || variation.variationName}</div>
                    <div className="text-muted">{variation.categoryName || "Uncategorized"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>SKU {variation.sku || "Missing"}</div>
                    {plan?.action === "replace-sku" ? <div className="mt-1">New SKU {plan.value}</div> : null}
                    <div className="text-muted">GTIN {variation.gtin || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    {plan?.value && !blocked ? (
                      <BarcodeMark
                        value={plan.value}
                        format={plan.format}
                        label={`Barcode for ${variation.itemName}${specificVariation(variation.variationName) ? `, ${variation.variationName}` : ""}. A scan reads ${plan.value}.`}
                      />
                    ) : (
                      <span className="text-muted">No scannable code</span>
                    )}
                    {plan && plan.action !== "ready" && plan.action !== "blocked" ? (
                      <div className="mt-1 text-xs text-muted">Preview only until you generate it.</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    {plan?.reason ? <p className="mt-2 max-w-xs text-xs leading-5 text-muted">{plan.reason}</p> : null}
                    {plan?.action === "ready" ? (
                      <p className="mt-2 max-w-xs text-xs leading-5 text-muted">
                        A scan reads {plan.value} and adds {specificVariation(variation.variationName) ? `the ${variation.variationName} variation` : "this variation"} in Square.
                      </p>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">
        {needsWork.length} variations in this view still need a barcode saved. Scan the preview with your phone before you print.{" "}
        <Link className="underline" href="/print">Open the print queue</Link>
        {" · "}
        <Link className="underline" href="/settings/barcode-test">Record a checkout test</Link>
      </p>
    </div>
  );
}
