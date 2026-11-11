import { NextResponse } from "next/server";
import { barcodePng, barcodeSvg } from "@/lib/barcodes/render";
import { failure } from "@/lib/http";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const value = url.searchParams.get("value") ?? "";
  const format = url.searchParams.get("format") ?? "code128";
  const height = Number(url.searchParams.get("height") ?? "12");
  const kind = url.searchParams.get("kind") === "png" ? "png" : "svg";
  if (!value || value.length > 80) {
    return NextResponse.json({ error: "Enter a barcode value of 80 characters or fewer." }, { status: 400 });
  }
  try {
    if (kind === "png") {
      const png = await barcodePng(value, format, Number.isFinite(height) ? height : 12);
      return new NextResponse(new Uint8Array(png), {
        headers: { "content-type": "image/png", "cache-control": "no-store" },
      });
    }
    const svg = barcodeSvg(value, format, Number.isFinite(height) ? height : 12);
    return new NextResponse(svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}
