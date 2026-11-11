import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, appPassword, passwordMatches, sessionSecret, signSession } from "@/lib/auth";
import { badRequest } from "@/lib/http";

const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: Request) {
  const password = appPassword();
  if (!password) return badRequest("No password is set. Local use is already open.");
  const secret = sessionSecret();
  if (!secret) return NextResponse.json({ error: "Set SESSION_SECRET before using a password." }, { status: 503 });

  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const current = attempts.get(ip);
  if (current && current.reset > Date.now() && current.count >= 8) {
    return NextResponse.json({ error: "Too many sign-in attempts. Wait a few minutes." }, { status: 429 });
  }

  const parsed = z.object({ password: z.string() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return badRequest("Enter your password.");
  const matches = await passwordMatches(parsed.data.password, password);
  if (!matches) {
    const next = current && current.reset > Date.now() ? current.count + 1 : 1;
    attempts.set(ip, { count: next, reset: Date.now() + 10 * 60 * 1000 });
    return NextResponse.json({ error: "That password is not right." }, { status: 401 });
  }
  attempts.delete(ip);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await signSession(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
