import { NextResponse } from "next/server";
import { getStudioData } from "@/lib/catalog/studio";
import { buildLabelBatch } from "@/lib/catalog/records";
import { buildCalibrationPdf, buildLabelsPdf } from "@/lib/labels/pdf";
import { failure, readJson } from "@/lib/http";

export async function POST(request: Request) {
  const body = (await readJson(request)) as {
    kind?: string;
    quantities?: { variationId: string; quantity: number }[];
    templateId?: string;
    presetId?: string;
  } | null;
  const data = await getStudioData();
  if (!data.ready) return NextResponse.json({ error: data.setupError }, { status: 500 });
  const preset = data.presets.find((item) => item.id === body?.presetId) ?? data.presets.find((item) => item.isDefault) ?? data.presets[0];
  if (!preset) return NextResponse.json({ error: "Save a label size before printing." }, { status: 400 });
  try {
    if (body?.kind === "calibration") {
      const bytes = await buildCalibrationPdf({
        widthMm: preset.widthMm,
        heightMm: preset.heightMm,
        offsetXMm: preset.offsetXMm,
        offsetYMm: preset.offsetYMm,
        scale: preset.scale,
        columns: preset.columns,
        columnGapMm: preset.columnGapMm,
      });
      return pdfResponse(bytes, "life-etc-calibration.pdf");
    }
    const template = data.templates.find((item) => item.id === body?.templateId) ?? data.templates.find((item) => item.isDefault) ?? data.templates[0];
    if (!template) return NextResponse.json({ error: "Save a label template before printing." }, { status: 400 });
    const batch = buildLabelBatch({
      variations: data.variations,
      quantities: body?.quantities ?? [],
      elements: template.elements,
      templateWidth: template.widthMm,
      templateHeight: template.heightMm,
      widthMm: preset.widthMm,
      heightMm: preset.heightMm,
      scale: preset.scale,
      logo: data.logo,
    });
    const bytes = await buildLabelsPdf(batch.labels, {
      offsetXMm: preset.offsetXMm,
      offsetYMm: preset.offsetYMm,
      scale: preset.scale,
      columns: preset.columns,
      columnGapMm: preset.columnGapMm,
    });
    return pdfResponse(bytes, "life-etc-labels.pdf");
  } catch (error) {
    return failure(error);
  }
}

function pdfResponse(bytes: Uint8Array, filename: string) {
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
