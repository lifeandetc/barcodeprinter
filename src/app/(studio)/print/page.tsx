import { getStudioData } from "@/lib/catalog/studio";
import { PrintQueue } from "@/components/print-queue";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const params = await searchParams;
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Print queue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Only products with a barcode from the Barcode Generator can be printed. Quantities here are labels, not a second inventory count.</p>
      </div>
      <PrintQueue data={data} initialIds={params.ids?.split(",").filter(Boolean) ?? []} />
    </div>
  );
}
