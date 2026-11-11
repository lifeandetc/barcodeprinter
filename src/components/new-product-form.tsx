"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { act } from "@/lib/browser";

export function NewProductForm({ categories }: { categories: { name: string }[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    description: "",
    variationName: "Regular",
    price: "",
    sku: "",
    categoryName: categories[0]?.name ?? "",
    trackInventory: true,
  });
  const [busy, setBusy] = useState(false);

  return (
    <form className="max-w-xl space-y-3" onSubmit={(event) => {
      event.preventDefault();
      setBusy(true);
      void act<{ itemId?: string; message?: string }>("createProduct", form).then((result) => {
        toast.success(result.message);
        router.push("/products");
        router.refresh();
      }).catch((error) => {
        toast.error(error.message);
        setBusy(false);
      });
    }}>
      <Field label="Product name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></Field>
      <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
      <Field label="Variation"><Input value={form.variationName} onChange={(event) => setForm({ ...form, variationName: event.target.value })} /></Field>
      <Field label="Price"><Input value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="48.00" required /></Field>
      <Field label="SKU"><Input value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} placeholder="Optional" /></Field>
      <Field label="Category"><Select value={form.categoryName} onChange={(event) => setForm({ ...form, categoryName: event.target.value })}>{categories.map((category) => <option key={category.name}>{category.name}</option>)}<option value="">No category</option></Select></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.trackInventory} onChange={(event) => setForm({ ...form, trackInventory: event.target.checked })} /> Track inventory</label>
      <Button disabled={busy}>Create product</Button>
    </form>
  );
}
