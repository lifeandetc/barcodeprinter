"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StudioData } from "@/lib/catalog/studio";
import { act } from "@/lib/browser";
import { ELEMENT_LABELS, type LabelElement } from "@/lib/labels/types";
import { LabelPreview } from "@/components/label-preview";
import { Button, Field, Input, Select } from "@/components/ui";

export function LabelDesigner({ data }: { data: StudioData }) {
  const router = useRouter();
  const starting = data.templates.find((template) => template.isDefault) ?? data.templates[0];
  const [templateId, setTemplateId] = useState(starting?.id ?? "");
  const current = data.templates.find((template) => template.id === templateId) ?? starting;
  const [name, setName] = useState(current?.name ?? "Jewelry tag");
  const [widthMm, setWidthMm] = useState(current?.widthMm ?? 12.7);
  const [heightMm, setHeightMm] = useState(current?.heightMm ?? 25.4);
  const [elements, setElements] = useState<LabelElement[]>(current?.elements ?? []);
  const [past, setPast] = useState<LabelElement[][]>([]);
  const [future, setFuture] = useState<LabelElement[][]>([]);
  const [selectedId, setSelectedId] = useState(elements.find((element) => element.visible)?.id ?? "name");
  const [variationId, setVariationId] = useState(data.variations[0]?.id ?? "");
  const [actual, setActual] = useState(false);
  const [busy, setBusy] = useState(false);
  const variation = data.variations.find((item) => item.id === variationId) ?? data.variations[0];
  const selected = elements.find((element) => element.id === selectedId) ?? null;
  const zoom = actual ? 96 / 25.4 : 4;

  function commit(next: LabelElement[]) {
    setPast((history) => [...history, elements].slice(-50));
    setFuture([]);
    setElements(next);
  }

  function patch(partial: Partial<LabelElement>) {
    if (!selected) return;
    commit(elements.map((element) => (element.id === selected.id ? { ...element, ...partial } : element)));
  }

  const sample = useMemo(() => variation ?? {
    itemName: "Gold Filled Bracelet",
    variationName: "Regular",
    showPrice: false,
    displayName: "Gold Filled Bracelet",
    sku: "LE-BR-GF-001",
    barcodeValue: "LE-BR-GF-001",
    barcodeFormat: "code128",
    priceAmount: 4800,
    currency: "USD",
  }, [variation]);

  async function save(asNew = false) {
    setBusy(true);
    try {
      await act("saveTemplate", {
        id: asNew ? undefined : templateId || undefined,
        name,
        widthMm: Number(widthMm),
        heightMm: Number(heightMm),
        marginMm: 1.5,
        elements,
        isDefault: !asNew && (current?.isDefault ?? true),
      });
      toast.success(asNew ? "Saved as a new template." : "Template saved on this Mac.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Template did not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_1fr_280px]">
      <aside className="space-y-4">
        <Field label="Template">
          <Select value={templateId} onChange={(event) => {
            const next = data.templates.find((template) => template.id === event.target.value);
            if (!next) return;
            setTemplateId(next.id);
            setName(next.name);
            setWidthMm(next.widthMm);
            setHeightMm(next.heightMm);
            setElements(next.elements);
            setPast([]);
            setFuture([]);
          }}>
            {data.templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
          </Select>
        </Field>
        <Field label="Sample product">
          <Select value={variationId} onChange={(event) => setVariationId(event.target.value)}>
            {data.variations.filter((item) => !item.isArchived).map((item) => (
              <option key={item.id} value={item.id}>{item.itemName}</option>
            ))}
          </Select>
        </Field>
        <div className="space-y-2">
          {elements.map((element) => (
            <label key={element.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{ELEMENT_LABELS[element.type]}</span>
              <input type="checkbox" checked={element.visible} onChange={(event) => {
                setSelectedId(element.id);
                commit(elements.map((item) => item.id === element.id ? { ...item, visible: event.target.checked } : item));
              }} />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!past.length} onClick={() => {
            const previous = past[past.length - 1];
            if (!previous) return;
            setFuture((items) => [elements, ...items]);
            setPast((items) => items.slice(0, -1));
            setElements(previous);
          }}>Undo</Button>
          <Button size="sm" variant="outline" disabled={!future.length} onClick={() => {
            const next = future[0];
            if (!next) return;
            setPast((items) => [...items, elements]);
            setFuture((items) => items.slice(1));
            setElements(next);
          }}>Redo</Button>
          <Button size="sm" variant="ghost" onClick={() => current && commit(current.elements)}>Reset</Button>
        </div>
      </aside>
      <div className="overflow-auto rounded-lg border border-line bg-[#ebe6de] p-8">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span>{widthMm} × {heightMm} mm</span>
          <Button size="sm" variant="outline" onClick={() => setActual((value) => !value)}>{actual ? "Fit" : "Actual size"}</Button>
        </div>
        <LabelPreview
          template={{ widthMm: Number(widthMm), heightMm: Number(heightMm), elements }}
          variation={sample}
          logo={data.logo}
          selectedId={selectedId}
          interactive
          zoom={zoom}
          onSelect={setSelectedId}
          onPointerDown={(id, event) => {
            const element = elements.find((item) => item.id === id);
            if (!element) return;
            setSelectedId(id);
            const startX = event.clientX;
            const startY = event.clientY;
            const originX = element.x;
            const originY = element.y;
            function move(moveEvent: PointerEvent) {
              const dx = (moveEvent.clientX - startX) / zoom;
              const dy = (moveEvent.clientY - startY) / zoom;
              setElements((currentElements) => currentElements.map((item) => item.id === id ? {
                ...item,
                x: round(originX + dx),
                y: round(originY + dy),
              } : item));
            }
            function up() {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
              setElements((currentElements) => {
                setPast((history) => [...history, elements].slice(-50));
                return currentElements;
              });
            }
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
        <p className="mt-4 max-w-md text-xs leading-5 text-muted">Actual size depends on the display. Print the calibration page before trusting alignment. Thermal output uses Arial or Georgia because those faces are available to the printer.</p>
      </div>
      <aside className="space-y-3">
        <Field label="Template name"><Input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width mm"><Input type="number" step="0.1" value={widthMm} onChange={(event) => setWidthMm(Number(event.target.value))} /></Field>
          <Field label="Height mm"><Input type="number" step="0.1" value={heightMm} onChange={(event) => setHeightMm(Number(event.target.value))} /></Field>
        </div>
        {selected ? (
          <div className="space-y-3 border-t border-line pt-3">
            <div className="text-sm font-medium">{ELEMENT_LABELS[selected.type]}</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="X"><Input type="number" step="0.5" value={selected.x} onChange={(event) => patch({ x: Number(event.target.value) })} /></Field>
              <Field label="Y"><Input type="number" step="0.5" value={selected.y} onChange={(event) => patch({ y: Number(event.target.value) })} /></Field>
              <Field label="Width"><Input type="number" step="0.5" value={selected.width} onChange={(event) => patch({ width: Number(event.target.value) })} /></Field>
              <Field label="Height"><Input type="number" step="0.5" value={selected.height} onChange={(event) => patch({ height: Number(event.target.value) })} /></Field>
            </div>
            <Field label="Align">
              <Select value={selected.align} onChange={(event) => patch({ align: event.target.value as LabelElement["align"] })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </Select>
            </Field>
            <Field label="Font">
              <Select value={selected.fontFamily} onChange={(event) => patch({ fontFamily: event.target.value as LabelElement["fontFamily"] })}>
                <option value="Montserrat">Montserrat</option>
                <option value="Georgia">Georgia</option>
              </Select>
            </Field>
            <Field label="Size"><Input type="number" step="0.5" value={selected.fontSize} onChange={(event) => patch({ fontSize: Number(event.target.value) })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.bold} onChange={(event) => patch({ bold: event.target.checked })} /> Bold</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.wrap} onChange={(event) => patch({ wrap: event.target.checked })} /> Wrap text</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.autoSize} onChange={(event) => patch({ autoSize: event.target.checked })} /> Resize to fit</label>
            <Field label="Rotation">
              <Select value={selected.rotation} onChange={(event) => patch({ rotation: Number(event.target.value) as LabelElement["rotation"] })}>
                <option value={0}>0°</option>
                <option value={90}>90°</option>
                <option value={180}>180°</option>
                <option value={270}>270°</option>
              </Select>
            </Field>
            {selected.type === "customText" || selected.type === "brand" ? (
              <Field label="Text override"><Input value={selected.customText ?? ""} onChange={(event) => patch({ customText: event.target.value })} /></Field>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button disabled={busy} onClick={() => save(false)}>Save template</Button>
          <Button variant="outline" disabled={busy} onClick={() => save(true)}>Save as new</Button>
        </div>
      </aside>
    </div>
  );
}

function round(value: number) {
  return Math.round(value * 2) / 2;
}
