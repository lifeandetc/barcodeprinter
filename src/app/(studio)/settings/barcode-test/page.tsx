import { getStudioData } from "@/lib/catalog/studio";
import { BarcodeTest } from "@/components/barcode-test";

export default async function BarcodeTestPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">Barcode test</h1>
      <BarcodeTest data={data} />
    </div>
  );
}
