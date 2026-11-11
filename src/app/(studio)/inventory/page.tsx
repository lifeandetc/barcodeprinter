import { getStudioData } from "@/lib/catalog/studio";
import { InventoryDesk } from "@/components/inventory-desk";

export default async function InventoryPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Stock changes use Square’s inventory adjustment or physical count. A failed write is not shown as success.</p>
      </div>
      <InventoryDesk data={data} />
    </div>
  );
}
