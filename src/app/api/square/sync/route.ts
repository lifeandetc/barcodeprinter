import { NextResponse } from "next/server";
import { failure, readJson } from "@/lib/http";
import { probeSquare, syncSquare } from "@/lib/square/sync";

export async function POST(request: Request) {
  const body = (await readJson(request)) as { trigger?: string; mode?: string } | null;
  const trigger = body?.trigger === "periodic" || body?.trigger === "webhook" ? body.trigger : "manual";
  try {
    if (body?.mode === "check") {
      const locations = await probeSquare();
      return NextResponse.json({
        ok: true,
        message: locations.length ? `Square responded with ${locations.length} location${locations.length === 1 ? "" : "s"}.` : "Square responded, but no locations were returned.",
        locations,
      });
    }
    const result = await syncSquare(trigger);
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}
