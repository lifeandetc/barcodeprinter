"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CategoryFocus } from "@/lib/catalog/category-focus";
import { act } from "@/lib/browser";
import { Button } from "@/components/ui";

export function CategoryFocusPanel({
  focus,
  catalogCategories,
}: {
  focus: CategoryFocus;
  catalogCategories: string[];
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(focus.enabled);
  const [selected, setSelected] = useState<string[]>(() =>
    focus.names.length ? focus.names : catalogCategories.includes("Christmas Market") ? ["Christmas Market"] : [],
  );
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => {
    if (!enabled || selected.length === 0) return "The full Square catalog is visible across the studio.";
    if (selected.length === 1) return `Only “${selected[0]}” is visible.`;
    return `${selected.length} categories are visible: ${selected.join(", ")}.`;
  }, [enabled, selected]);

  function toggle(name: string) {
    setSelected((current) => (current.includes(name) ? current.filter((item) => item !== name) : [...current, name]));
  }

  async function save() {
    setBusy(true);
    try {
      const result = await act("saveCategoryFocus", { enabled, names: selected });
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Category focus was not saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 rounded-lg border border-line bg-card p-5">
      <div>
        <h2 className="text-sm font-medium">Category focus</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Turn this on when you only need barcodes or labels for certain Square categories, such as Christmas Market. Products outside the selected categories are hidden until you turn focus off.
        </p>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        <span>
          <span className="font-medium">Focus on selected categories</span>
          <span className="mt-1 block text-muted">{summary}</span>
        </span>
      </label>
      {catalogCategories.length === 0 ? (
        <p className="text-sm text-muted">Import Square first. Categories come from your catalog.</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {catalogCategories.map((name) => (
            <label key={name} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm">
              <input type="checkbox" checked={selected.includes(name)} onChange={() => toggle(name)} />
              {name}
            </label>
          ))}
        </div>
      )}
      <Button disabled={busy || catalogCategories.length === 0} onClick={() => void save()}>
        Save category focus
      </Button>
    </div>
  );
}
