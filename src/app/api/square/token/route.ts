import { NextResponse } from "next/server";
import { purgeDemoCatalog } from "@/lib/catalog/purge-demo";
import { failure, readJson } from "@/lib/http";
import { saveSquareCredentials } from "@/lib/square/env";

export async function POST(request: Request) {
  const body = (await readJson(request)) as { token?: string; environment?: string } | null;
  try {
    const saved = await saveSquareCredentials({
      token: body?.token ?? "",
      environment: body?.environment === "sandbox" ? "sandbox" : "production",
    });
    await purgeDemoCatalog();
    return NextResponse.json({
      configured: true,
      environment: saved.environment,
      message: "Square token saved on this Mac. It is not shown in the browser.",
    });
  } catch (error) {
    return failure(error);
  }
}
