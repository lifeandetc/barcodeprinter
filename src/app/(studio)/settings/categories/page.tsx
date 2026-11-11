import { getStudioData } from "@/lib/catalog/studio";
import { CategoryFocusPanel } from "@/components/category-focus-panel";

export default async function CategoryFocusPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-4xl">Category focus</h1>
      <p className="text-sm leading-6 text-muted">
        This master switch limits Products, Barcode Generator, Print Queue, and Inventory to the categories you pick. Square still holds the full catalog.
      </p>
      <CategoryFocusPanel focus={data.categoryFocus} catalogCategories={data.catalogCategories} />
    </div>
  );
}
