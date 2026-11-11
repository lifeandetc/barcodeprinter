import { NextResponse } from "next/server";
import { squareErrorMessage } from "@/lib/square/errors";

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function failure(error: unknown) {
  const message = squareErrorMessage(error);
  const status = /not configured|confirm|demo mode/i.test(message) ? 400 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
