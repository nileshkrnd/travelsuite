import { NextResponse } from "next/server";
import {
  ingestWhatsAppWebhook,
  parseWhatsAppWebhookPayload,
  resolveWhatsAppMailbox,
  verifyWhatsAppSignature,
} from "@/lib/services/whatsapp-helpdesk.service";
import { resolveHelpdeskTenantId } from "@/lib/services/helpdesk-email-ingest.service";
import { getHelpdeskDb } from "@/lib/db";

/**
 * Meta WhatsApp Cloud API webhook.
 * GET  — verification handshake
 * POST — inbound customer messages → helpdesk tickets (channel=whatsapp)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }

  const config = await resolveWhatsAppMailbox();
  if (!config || token !== config.verifyToken) {
    return NextResponse.json({ error: "Verification token mismatch" }, { status: 403 });
  }

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const preview = parseWhatsAppWebhookPayload(payload);
    const config = await resolveWhatsAppMailbox({
      phoneNumberId: preview.phoneNumberId || undefined,
    });

    if (config && !verifyWhatsAppSignature(rawBody, signature, config.appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const tenantId = await resolveHelpdeskTenantId();
    const result = await ingestWhatsAppWebhook({ tenantId, payload });

    if (config?.mailboxId) {
      const db = getHelpdeskDb();
      if (result.errors.length) {
        await db.helpdeskMailbox.update({
          where: { mailboxId: config.mailboxId },
          data: {
            lastSyncError: result.errors.slice(0, 3).join("; ").slice(0, 1000),
            modifiedDtTm: new Date(),
          },
        });
      } else if (result.fetched > 0 || result.createdTickets > 0 || result.appendedMessages > 0) {
        // ingestInboundEmails already clears lastSyncError / sets lastSyncAt on the ensured mailbox
      }
    }

    // Always 200 quickly so Meta does not retry endlessly on app errors.
    return NextResponse.json({
      ok: true,
      fetched: result.fetched,
      createdTickets: result.createdTickets,
      appendedMessages: result.appendedMessages,
      skipped: result.skipped,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[whatsapp webhook]", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
