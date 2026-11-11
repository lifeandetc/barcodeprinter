import { getStudioData } from "@/lib/catalog/studio";
import { formatWhen } from "@/lib/format";

export default async function SyncHistoryPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">Sync history</h1>
      <p className="max-w-2xl text-sm leading-6 text-muted">Webhooks need a public HTTPS notification URL and a signature key. Until then, Sync now and the 10-minute reconciliation are the working path.</p>
      <div className="space-y-3">
        {data.syncs.map((run) => (
          <article key={run.id} className="rounded-lg border border-line bg-card px-4 py-3 text-sm">
            <div className="flex justify-between gap-3"><span>{run.trigger} · {run.status}</span><span className="text-muted">{formatWhen(run.finishedAt || run.startedAt)}</span></div>
            <div className="text-muted">{run.itemsSeen} products · {run.variationsSeen} variations · {run.conflicts} conflicts</div>
            {run.error ? <p className="mt-1 text-danger">{run.error}</p> : null}
            {run.details.map((detail) => <p key={detail} className="text-muted">{detail}</p>)}
          </article>
        ))}
        {data.syncs.length === 0 ? <p className="text-sm text-muted">No syncs yet.</p> : null}
      </div>
      <div>
        <h2 className="text-sm font-medium">Webhook events</h2>
        {data.webhooks.length === 0 ? <p className="mt-2 text-sm text-muted">No webhook events have been received.</p> : null}
        {data.webhooks.map((event) => (
          <div key={event.eventId} className="border-b border-line py-2 text-sm">{event.type} · {event.status}{event.error ? ` · ${event.error}` : ""}</div>
        ))}
      </div>
    </div>
  );
}
