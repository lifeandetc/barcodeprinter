import { getStudioData } from "@/lib/catalog/studio";

export default async function LocationsPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl">Locations</h1>
      {data.locations.length === 0 ? <p className="text-sm text-muted">No locations yet. Check the Square connection or stay in the demo studio.</p> : null}
      <div className="divide-y divide-line rounded-lg border border-line bg-card">
        {data.locations.map((location) => (
          <div key={location.id} className="px-4 py-3 text-sm">
            <div>{location.name}</div>
            <div className="text-muted">{[location.address, location.timezone, location.currency, location.status].filter(Boolean).join(" · ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
