"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { act, downloadPdf } from "@/lib/browser";
import { BARCODE_FORMATS } from "@/lib/barcodes/select";
import { Button, Field, Select, Textarea } from "@/components/ui";

export function BarcodeTest({ data }: { data: StudioData }) {
  const router = useRouter();
  const [variationId, setVariationId] = useState(data.variations.find((variation) => variation.sku)?.id ?? "");
  const [source, setSource] = useState("sku");
  const [format, setFormat] = useState("code128");
  const [result, setResult] = useState("pending");
  const [notes, setNotes] = useState("");
  const variation = data.variations.find((item) => item.id === variationId);
  const encoded = source === "gtin" ? variation?.gtin : variation?.sku;

  return (
    <div className="max-w-2xl space-y-4">
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-6">
        <li>Choose one Square product.</li>
        <li>Use its existing SKU or GTIN. A missing GTIN is not invented.</li>
        <li>Save the test barcode and print one label.</li>
        <li>Scan it with your Square checkout device.</li>
        <li>Record whether Square found the right product and price.</li>
      </ol>
      {!data.verification ? <p className="text-sm text-warn">No barcode format is guaranteed with your hardware yet.</p> : <p className="text-sm text-ok">Last match: {data.verification.format} using {data.verification.identifierField}.</p>}
      <Field label="Product">
        <Select value={variationId} onChange={(event) => setVariationId(event.target.value)}>
          {data.variations.filter((item) => !item.isArchived).map((item) => <option key={item.id} value={item.id}>{item.itemName}</option>)}
        </Select>
      </Field>
      <p className="text-sm">SKU {variation?.sku || "none"} · GTIN {variation?.gtin || "none"} · Price is live from the catalog after sync.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Identifier"><Select value={source} onChange={(event) => setSource(event.target.value)}><option value="sku">SKU</option><option value="gtin">GTIN</option></Select></Field>
        <Field label="Format"><Select value={format} onChange={(event) => setFormat(event.target.value)}>{BARCODE_FORMATS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
      </div>
      <p className="text-sm">Encoded value: {encoded || "Unavailable"}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => {
          if (!encoded) return toast.error("That identifier is not on the product.");
          void act("saveBarcode", { variationId, source, format, regenerate: true }).then(() => downloadPdf({
            quantities: [{ variationId, quantity: 1 }],
            templateId: data.templates.find((template) => template.isDefault)?.id,
            presetId: data.presets.find((preset) => preset.isDefault)?.id,
          }, "life-etc-barcode-test.pdf")).then(() => toast.success("Test label PDF downloaded.")).catch((error) => toast.error(error.message));
        }}>Save and download one label</Button>
      </div>
      <Field label="Checkout result">
        <Select value={result} onChange={(event) => setResult(event.target.value)}>
          <option value="pending">Not scanned yet</option>
          <option value="matched">Square found the correct product and price</option>
          <option value="mismatched">Square found a different product or price</option>
          <option value="unscannable">The code would not scan</option>
        </Select>
      </Field>
      <Field label="Notes"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
      <Button onClick={() => {
        if (!encoded) return;
        void act("saveTest", { variationId, format, identifierField: source, encodedValue: encoded, result, notes, printed: true }).then(() => {
          toast.success(result === "matched" ? "Verified mapping saved." : "Test recorded. This format is not marked compatible.");
          router.refresh();
        }).catch((error) => toast.error(error.message));
      }}>Record scan result</Button>
      <div className="space-y-2 text-sm">
        {data.tests.map((test) => <div key={test.id} className="border-b border-line py-2">{test.itemName} · {test.format} · {test.result}</div>)}
      </div>
    </div>
  );
}
