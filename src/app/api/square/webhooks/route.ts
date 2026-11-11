import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { squareErrorMessage } from "@/lib/square/errors";
import { verifySquareWebhook } from "@/lib/square/remote";
import { syncSquare } from "@/lib/square/sync";
import { webhookDecision } from "@/lib/webhooks/decision";

export async function POST(request: Request) {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim() ?? "";
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL?.trim() ?? "";
  if (!signatureKey || !notificationUrl) {
    return NextResponse.json(
      { error: "Webhook signature settings are missing. Use Sync Now until SQUARE_WEBHOOK_SIGNATURE_KEY and SQUARE_WEBHOOK_NOTIFICATION_URL are set." },
      { status: 503 },
    );
  }
  const requestBody = await request.text();
  const signatureHeader = request.headers.get("x-square-hmacsha256-signature") ?? "";
  const signatureValid = await verifySquareWebhook({ requestBody, signatureHeader, signatureKey, notificationUrl });
  let eventId = "";
  let type = "unknown";
  try {
    const payload = JSON.parse(requestBody) as { event_id?: string; eventId?: string; type?: string };
    eventId = payload.event_id || payload.eventId || "";
    type = payload.type || "unknown";
  } catch {
    return NextResponse.json({ error: "Webhook body was not valid JSON." }, { status: 400 });
  }
  if (!eventId) return NextResponse.json({ error: "Webhook event id is missing." }, { status: 400 });
  const existing = await prisma.webhookEvent.findUnique({ where: { eventId } });
  const decision = webhookDecision(signatureValid, Boolean(existing));
  if (decision === "reject") return NextResponse.json({ error: "Webhook signature was rejected." }, { status: 403 });
  if (decision === "duplicate") return NextResponse.json({ ok: true, duplicate: true });

  await prisma.webhookEvent.create({ data: { eventId, type, status: "received" } });
  if (!type.startsWith("catalog.") && !type.startsWith("inventory.")) {
    await prisma.webhookEvent.update({ where: { eventId }, data: { status: "ignored", processedAt: new Date() } });
    return NextResponse.json({ ok: true, ignored: true });
  }
  try {
    const result = await syncSquare("webhook");
    await prisma.webhookEvent.update({
      where: { eventId },
      data: { status: result.skipped ? "coalesced" : "processed", processedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = squareErrorMessage(error);
    await prisma.webhookEvent.update({ where: { eventId }, data: { status: "failed", error: message, processedAt: new Date() } });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
