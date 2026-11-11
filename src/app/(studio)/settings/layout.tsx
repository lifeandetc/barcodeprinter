import { SettingsNav } from "@/components/settings-nav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
