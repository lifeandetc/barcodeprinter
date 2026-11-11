import { getStudioData } from "@/lib/catalog/studio";
import { hasSquareToken } from "@/lib/utils";
import { SquarePanel } from "@/components/square-panel";

export default async function SquareSettingsPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  const configured = hasSquareToken();
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-4xl">Square</h1>
      <p className="text-sm leading-6 text-muted">
        Paste the personal access token here. The server writes it to <code>SQUARE_ACCESS_TOKEN</code> and does not send it back to the browser.
      </p>
      <p className="text-sm">Status: {data.connection.label}. Environment: {data.environment || "not set"}.</p>
      <p className="text-sm text-muted">{configured ? "A token is saved on this Mac." : "No token is saved, so the studio is not calling Square."}</p>
      <SquarePanel configured={configured} environment={data.environment} />
      <div className="text-sm leading-6 text-muted">
        Required scopes: ITEMS_READ, ITEMS_WRITE, INVENTORY_READ, INVENTORY_WRITE, MERCHANT_PROFILE_READ. API version follows the installed Square SDK, currently 2026-09-16. Square Premium is not required for these APIs.
      </div>
    </div>
  );
}
