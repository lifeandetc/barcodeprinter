import { getStudioData } from "@/lib/catalog/studio";
import { LogoForm } from "@/components/logo-form";

export default async function SettingsPage() {
  const data = await getStudioData();
  if (!data.ready) return null;
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="text-sm leading-6 text-muted">{data.connection.detail}</p>
      <LogoForm logo={data.logo} />
      <p className="text-sm leading-6 text-muted">Drop a Dream Avenue font file at public/fonts/DreamAvenue.woff2 and the wordmark will use it. Montserrat is the interface type.</p>
    </div>
  );
}
