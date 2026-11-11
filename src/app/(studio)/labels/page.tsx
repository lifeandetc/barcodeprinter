import { getStudioData } from "@/lib/catalog/studio";
import { LabelDesigner } from "@/components/label-designer";

export default async function LabelsPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Label designer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Change what the tag says without editing the Square product. A long catalog name can print as a short label name.</p>
      </div>
      <LabelDesigner data={data} />
    </div>
  );
}
