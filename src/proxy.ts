import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, authRequired, sessionSecret, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/square/webhooks") || pathname === "/login") {
    return NextResponse.next();
  }
  if (!authRequired()) return NextResponse.next();

  const password = process.env.APP_ACCESS_PASSWORD ?? "";
  const secret = sessionSecret();
  if (process.env.NODE_ENV === "production" && !password) {
    return new NextResponse("Set APP_ACCESS_PASSWORD before running this app in production.", { status: 503 });
  }
  if (password && !secret) {
    return new NextResponse("Set SESSION_SECRET before using a password.", { status: 503 });
  }

  const valid = await verifySession(secret, request.cookies.get(SESSION_COOKIE)?.value);
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const cron = process.env.CRON_SECRET;
    const header = request.headers.get("authorization");
    if (pathname === "/api/square/sync" && cron && header === `Bearer ${cron}`) {
      return NextResponse.next();
    }
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|vendor/|fonts/).*)"],
};
