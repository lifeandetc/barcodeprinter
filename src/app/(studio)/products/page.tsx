import Link from "next/link";
import { getStudioData } from "@/lib/catalog/studio";
import { ProductTable } from "@/components/product-table";

export default async function ProductsPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Products</h1>
          <p className="mt-2 text-sm text-muted">Each row is a Square variation. Label names live only in this app.</p>
        </div>
        <Link href="/products/new" className="rounded-md bg-ink px-3 py-2 text-sm text-background">New product</Link>
      </div>
      <ProductTable variations={data.variations} />
    </div>
  );
}
