import { getStudioData } from "@/lib/catalog/studio";
import { PrinterDesk } from "@/components/printer-desk";

export default async function PrinterPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Printer</h1>
      <PrinterDesk data={data} />
    </div>
  );
}
