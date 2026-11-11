"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Barcode,
  Boxes,
  Gem,
  LayoutDashboard,
  Printer,
  RefreshCw,
  Settings,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatWhen } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Gem },
  { href: "/barcodes", label: "Barcode Generator", icon: Barcode },
  { href: "/labels", label: "Label Designer", icon: Tag },
  { href: "/print", label: "Print Queue", icon: Printer },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/settings", label: "Settings", icon: Settings },
];

export type ShellStatus = {
  mode: string;
  environment: string | null;
  connection: { code: string; label: string; detail: string };
  lastSync: { finishedAt: string | null; status: string } | null;
  logo: string | null;
};

export function Shell({ status, children }: { status: ShellStatus; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (status.mode === "demo") return;
    const timer = window.setInterval(() => {
      void fetch("/api/square/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trigger: "periodic" }),
      }).then((response) => {
        if (response.ok) router.refresh();
      });
    }, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [router, status.mode]);

  async function syncNow() {
    setSyncing(true);
    try {
      const response = await fetch("/api/square/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sync failed.");
      toast.success(data.message || "Square sync finished.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-sidebar lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          {status.logo ? (
            <img src={status.logo} alt="Life & Etc. logo" className="h-10 w-10 object-contain" />
          ) : (
            <div className="font-display text-[1.7rem] leading-none tracking-tight">Life & Etc.</div>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  active ? "bg-ink text-background" : "text-ink/80 hover:bg-black/5",
                )}
              >
                <Icon size={16} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-8">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">Life & Etc. LLC</div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", status.connection.code === "square" ? "bg-ok" : "bg-warn")} />
                {status.connection.label}
                {status.environment ? <span className="text-muted">· {status.environment}</span> : null}
              </span>
              <span className="text-muted">Last sync {formatWhen(status.lastSync?.finishedAt)}</span>
            </div>
          </div>
          <Button onClick={syncNow} disabled={syncing || status.mode === "demo"}>
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing" : "Sync now"}
          </Button>
        </header>
        {status.mode !== "square" ? (
          <div className="border-b border-line bg-card px-5 py-3 text-sm text-muted md:px-8">{status.connection.detail}</div>
        ) : null}
        <main className="px-5 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
