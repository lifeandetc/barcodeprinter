import { getStudioData } from "@/lib/catalog/studio";
import { PrintQueue } from "@/components/print-queue";

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ ids?: string }> }) {
  const params = await searchParams;
  const data = await getStudioData({ ignoreCategoryFocus: true });
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Print queue</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Check the categories you still need. Each check fills one label per piece in stock, so you do not have to type every quantity. On the Mac where your LabelWriter is plugged in, connect DYMO Connect once—then print labels directly from this page.
        </p>
      </div>
      <PrintQueue data={data} initialIds={params.ids?.split(",").filter(Boolean) ?? []} />
    </div>
  );
}
