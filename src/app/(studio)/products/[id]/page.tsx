import { notFound } from "next/navigation";
import { getStudioData } from "@/lib/catalog/studio";
import { ProductDetail } from "@/components/product-detail";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getStudioData();
  if (!data.ready) return null;
  const variation = data.variations.find((item) => item.id === id);
  if (!variation) notFound();
  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl">{variation.itemName}</h1>
      <ProductDetail data={data} variation={variation} />
    </div>
  );
}
