import { connection } from "next/server";
import { getStudioData } from "@/lib/catalog/studio";
import { Shell } from "@/components/shell";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const data = await getStudioData();
  if (!data.ready) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <div className="font-display text-4xl">Life & Etc.</div>
        <p className="mt-4 text-sm leading-6 text-muted">{data.setupError}</p>
      </div>
    );
  }
  return (
    <Shell
      status={{
        mode: data.mode,
        environment: data.environment,
        connection: data.connection,
        lastSync: data.lastSync,
        logo: data.logo,
        categoryFocus: data.categoryFocus,
      }}
    >
      {children}
    </Shell>
  );
}
