"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/settings", "Overview"],
  ["/settings/categories", "Category focus"],
  ["/settings/square", "Square connection"],
  ["/settings/locations", "Locations"],
  ["/settings/printer", "Printer setup"],
  ["/settings/labels", "Label sizes"],
  ["/settings/templates", "Saved templates"],
  ["/settings/sync", "Sync history"],
  ["/settings/barcode-test", "Barcode test"],
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-1">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={cn("block shrink-0 rounded-md px-3 py-2 text-sm", pathname === href ? "bg-ink text-background" : "hover:bg-black/5")}>{label}</Link>
      ))}
    </nav>
  );
}
