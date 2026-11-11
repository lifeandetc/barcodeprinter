import { getStudioData } from "@/lib/catalog/studio";
import { NewProductForm } from "@/components/new-product-form";

export default async function NewProductPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">New product</h1>
      <p className="max-w-xl text-sm leading-6 text-muted">With a Square token, this creates the item through the Catalog API. In demo mode it stays on this Mac and says so.</p>
      <NewProductForm categories={data.categories} />
    </div>
  );
}
