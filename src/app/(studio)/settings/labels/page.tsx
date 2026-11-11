import { getStudioData } from "@/lib/catalog/studio";
import { PrinterDesk } from "@/components/printer-desk";

export default async function LabelSizesPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Label sizes</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted">Use the width and height printed on your label packaging. PDF pages are created at that exact size, one label per page.</p>
      <PrinterDesk data={data} />
    </div>
  );
}
