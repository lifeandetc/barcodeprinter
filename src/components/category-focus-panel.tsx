"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [selected, setSelected] = useState<string[]>(() => [...focus.names]);
  const [busy, setBusy] = useState(false);

  const savedKey = `${focus.enabled}:${focus.names.join("\u0000")}`;

  useEffect(() => {
    setEnabled(focus.enabled);
    setSelected([...focus.names]);
  }, [savedKey, focus.enabled, focus.names]);

  const summary = useMemo(() => {
    if (!enabled || selected.length === 0) return "The full Square catalog is visible across the studio.";
    if (selected.length === 1) return `Only “${selected[0]}” is visible.`;
    return `${selected.length} categories are visible: ${selected.join(", ")}.`;
  }, [enabled, selected]);

  function toggle(name: string) {
    setSelected((current) => {
      const next = current.includes(name) ? current.filter((item) => item !== name) : [...current, name];
      if (next.length > 0) setEnabled(true);
      else setEnabled(false);
      return next;
    });
  }

  async function save() {
    setBusy(true);
    try {
      if (enabled && selected.length === 0) {
        toast.error("Choose at least one category before turning focus on.");
        return;
      }
      if (!enabled && selected.length > 0) {
        toast.error('Turn on "Focus on selected categories" above, then save.');
        return;
      }
      const result = await act<{ message?: string; focus?: CategoryFocus }>("saveCategoryFocus", {
        enabled,
        names: enabled ? selected : [],
      });
      if (result.focus) {
        setEnabled(result.focus.enabled);
        setSelected([...result.focus.names]);
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Category focus was not saved.");
    } finally {
      setBusy(false);
    }
  }

  async function clearFocus() {
    setBusy(true);
    try {
      const result = await act<{ message?: string; focus?: CategoryFocus }>("saveCategoryFocus", {
        enabled: false,
        names: [],
      });
      setEnabled(false);
      setSelected([]);
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Category focus was not cleared.");
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
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || catalogCategories.length === 0} onClick={() => void save()}>
          Save category focus
        </Button>
        {focus.enabled || focus.names.length ? (
          <Button variant="outline" disabled={busy} onClick={() => void clearFocus()}>
            Turn focus off
          </Button>
        ) : null}
      </div>
    </div>
  );
}
