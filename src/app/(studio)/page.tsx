import Link from "next/link";
import { getStudioData } from "@/lib/catalog/studio";
import { formatMoney, formatQty, formatWhen } from "@/lib/format";
import { Badge, Card } from "@/components/ui";

export default async function DashboardPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  const recent = data.variations.filter((variation) => !variation.isArchived).slice().sort((a, b) => b.syncedAt.localeCompare(a.syncedAt)).slice(0, 6);
  const stats = [
    ["Active products", data.stats.products],
    ["Variations", data.stats.variations],
    ["Units available", formatQty(data.stats.units)],
    ["Out of stock", data.stats.outOfStock],
  ];
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl tracking-tight">Studio</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Square stays the source of truth for price and stock. Labels, barcodes, and printer setup stay in this workspace.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={String(label)} className="px-5 py-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
            <div className="mt-3 text-3xl font-medium tracking-tight">{value}</div>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Product health</h2>
            <Link href="/products" className="text-sm underline decoration-line underline-offset-4">View products</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Health href="/barcodes" label="Missing barcodes" value={data.stats.missingBarcodes} />
            <Health href="/print" label="Need labels" value={data.stats.needsLabels} />
            <Health href="/inventory" label="Low stock" value={data.stats.lowStock} />
            <Health href="/inventory" label="Out of stock" value={data.stats.outOfStock} />
          </div>
          <div className="mt-6 space-y-3">
            {data.categories.length === 0 ? <p className="text-sm text-muted">No categories yet.</p> : null}
            {data.categories.map((category) => (
              <div key={category.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <div>
                  <div>{category.name}</div>
                  <div className="mt-1 h-px bg-line">
                    <div className="h-px bg-ink" style={{ width: `${Math.max(8, (category.count / data.stats.variations) * 100)}%` }} />
                  </div>
                </div>
                <span className="text-muted">{category.count}</span>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-medium">Quick actions</h2>
            <div className="mt-4 grid gap-2 text-sm">
              <Link className="rounded-md border border-line px-3 py-2 hover:border-ink" href="/products/new">Create a product</Link>
              <Link className="rounded-md border border-line px-3 py-2 hover:border-ink" href="/barcodes">Generate barcodes</Link>
              <Link className="rounded-md border border-line px-3 py-2 hover:border-ink" href="/labels">Design a tag</Link>
              <Link className="rounded-md border border-line px-3 py-2 hover:border-ink" href="/print">Open the print queue</Link>
              <Link className="rounded-md border border-line px-3 py-2 hover:border-ink" href="/settings/barcode-test">Test a Square scan</Link>
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-medium">Recent activity</h2>
            <div className="mt-4 space-y-3">
              {data.activity.length === 0 ? <p className="text-sm text-muted">Nothing has been recorded yet.</p> : null}
              {data.activity.map((item) => (
                <div key={`${item.at}-${item.title}`} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <div>{item.title}</div>
                    <div className="text-muted">{item.detail}</div>
                  </div>
                  <div className="shrink-0 text-muted">{formatWhen(item.at)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Card>
        <div className="border-b border-line px-5 py-4 text-sm font-medium">Recently updated</div>
        <div className="divide-y divide-line">
          {recent.length === 0 ? <p className="px-5 py-8 text-sm text-muted">Import Square, or keep working in the demo catalog.</p> : null}
          {recent.map((variation) => (
            <Link key={variation.id} href={`/products/${variation.id}`} className="grid gap-2 px-5 py-3 text-sm hover:bg-black/[0.02] md:grid-cols-[1.4fr_0.6fr_0.5fr_0.6fr]">
              <span>{variation.itemName}</span>
              <span className="text-muted">{variation.variationName}</span>
              <span>{formatMoney(variation.priceAmount, variation.currency)}</span>
              <span className="flex items-center gap-2">
                {variation.barcodeValue ? <Badge tone="ok">Barcode</Badge> : <Badge tone="warn">No barcode</Badge>}
                <span className="text-muted">{formatWhen(variation.syncedAt)}</span>
              </span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Health({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="rounded-md border border-line px-4 py-3 hover:border-ink">
      <div className="text-2xl font-medium">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </Link>
  );
}
