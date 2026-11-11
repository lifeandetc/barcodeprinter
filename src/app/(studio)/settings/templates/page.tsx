import Link from "next/link";
import { getStudioData } from "@/lib/catalog/studio";

export default async function TemplatesPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Templates</h1>
      {data.templates.map((template) => (
        <div key={template.id} className="flex items-center justify-between rounded-lg border border-line bg-card px-4 py-3 text-sm">
          <div>
            <div>{template.name}{template.isDefault ? " · default" : ""}</div>
            <div className="text-muted">{template.widthMm} × {template.heightMm} mm</div>
          </div>
          <Link href="/labels" className="underline">Edit</Link>
        </div>
      ))}
    </div>
  );
}
