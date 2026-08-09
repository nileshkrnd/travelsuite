import { createHmac, timingSafeEqual } from "node:crypto";
import { getHelpdeskDb } from "@/lib/db";
import { decryptMailboxCredentials } from "@/lib/helpdesk-credentials";
import {
  ingestInboundEmails,
  resolveHelpdeskTenantId,
  type HelpdeskEmailSyncResult,
  type InboundEmailMessage,
} from "@/lib/services/helpdesk-email-ingest.service";
import {
  normalizeWhatsAppPhone,
  whatsAppConversationId,
  whatsAppToDigits,
} from "@/lib/whatsapp-phone";

const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v21.0";

export type WhatsAppMailboxConfig = {
  mailboxId: number | null;
  displayNumber: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  appSecret: string | null;
  businessAccountId: string | null;
};

export async function resolveWhatsAppMailbox(options?: {
  tenantId?: number;
  phoneNumberId?: string;
}): Promise<WhatsAppMailboxConfig | null> {
  const tenantId = await resolveHelpdeskTenantId(options?.tenantId).catch(() => 0);
  const db = getHelpdeskDb();

  if (tenantId > 0) {
    const boxes = await db.helpdeskMailbox.findMany({
      where: { tenantId, isActive: true, provider: "whatsapp" },
      orderBy: { mailboxId: "asc" },
    });
    for (const box of boxes) {
      try {
        const creds = decryptMailboxCredentials(box.credentialsEnc);
        if (!creds.waPhoneNumberId || !creds.waAccessToken || !creds.waVerifyToken) continue;
        if (options?.phoneNumberId && creds.waPhoneNumberId !== options.phoneNumberId) continue;
        return {
          mailboxId: box.mailboxId,
          displayNumber: normalizeWhatsAppPhone(box.mailboxAddress),
          phoneNumberId: creds.waPhoneNumberId,
          accessToken: creds.waAccessToken,
          verifyToken: creds.waVerifyToken,
          appSecret: creds.waAppSecret || null,
          businessAccountId: creds.waBusinessAccountId || null,
        };
      } catch {
        /* skip bad credentials */
      }
    }
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "";
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "";
  const displayNumber = normalizeWhatsAppPhone(
    process.env.WHATSAPP_DISPLAY_NUMBER?.trim() || "+97477930700"
  );
  if (!phoneNumberId || !accessToken || !verifyToken) return null;
  if (options?.phoneNumberId && phoneNumberId !== options.phoneNumberId) return null;

  return {
    mailboxId: null,
    displayNumber,
    phoneNumberId,
    accessToken,
    verifyToken,
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || null,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || null,
  };
}

export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | null
): boolean {
  if (!appSecret) return true; // optional in dev
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

type WaContact = { profile?: { name?: string }; wa_id?: string };
type WaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string; id?: string };
  document?: { caption?: string; filename?: string; id?: string };
  audio?: { id?: string };
  video?: { caption?: string; id?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

function extractMessageText(msg: WaMessage): string {
  if (msg.type === "text") return msg.text?.body?.trim() || "";
  if (msg.type === "button") return msg.button?.text?.trim() || "[button]";
  if (msg.type === "interactive") {
    return (
      msg.interactive?.button_reply?.title?.trim() ||
      msg.interactive?.list_reply?.title?.trim() ||
      "[interactive]"
    );
  }
  if (msg.type === "image") {
    const cap = msg.image?.caption?.trim();
    return cap ? `[Image] ${cap}` : "[Image]";
  }
  if (msg.type === "document") {
    const name = msg.document?.filename?.trim() || "file";
    const cap = msg.document?.caption?.trim();
    return cap ? `[Document: ${name}] ${cap}` : `[Document: ${name}]`;
  }
  if (msg.type === "audio") return "[Audio]";
  if (msg.type === "video") {
    const cap = msg.video?.caption?.trim();
    return cap ? `[Video] ${cap}` : "[Video]";
  }
  return `[${msg.type || "message"}]`;
}

export function parseWhatsAppWebhookPayload(payload: unknown): {
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  messages: InboundEmailMessage[];
} {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string; display_phone_number?: string };
          contacts?: WaContact[];
          messages?: WaMessage[];
        };
      }>;
    }>;
  };

  const messages: InboundEmailMessage[] = [];
  let phoneNumberId: string | null = null;
  let displayPhoneNumber: string | null = null;

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages?.length) continue;
      phoneNumberId = value.metadata?.phone_number_id || phoneNumberId;
      displayPhoneNumber = value.metadata?.display_phone_number
        ? normalizeWhatsAppPhone(value.metadata.display_phone_number)
        : displayPhoneNumber;

      const nameByWaId = new Map<string, string>();
      for (const c of value.contacts ?? []) {
        if (c.wa_id) nameByWaId.set(whatsAppToDigits(c.wa_id), c.profile?.name?.trim() || "");
      }

      for (const msg of value.messages) {
        if (!msg.id || !msg.from) continue;
        const fromDigits = whatsAppToDigits(msg.from);
        const fromPhone = normalizeWhatsAppPhone(msg.from);
        const fromName = nameByWaId.get(fromDigits) || fromPhone;
        const bodyText = extractMessageText(msg);
        const receivedAt = msg.timestamp
          ? new Date(Number(msg.timestamp) * 1000)
          : new Date();
        const preview = bodyText.slice(0, 120);
        messages.push({
          externalId: msg.id,
          conversationId: whatsAppConversationId(fromPhone),
          internetMessageId: msg.id,
          subject: `WhatsApp from ${fromName}`,
          fromName,
          fromEmail: fromPhone,
          toEmails: displayPhoneNumber,
          bodyPreview: preview,
          bodyHtml: null,
          bodyText,
          receivedAt: Number.isNaN(receivedAt.getTime()) ? new Date() : receivedAt,
        });
      }
    }
  }

  return { phoneNumberId, displayPhoneNumber, messages };
}

export async function ingestWhatsAppWebhook(input: {
  tenantId?: number;
  payload: unknown;
}): Promise<HelpdeskEmailSyncResult & { phoneNumberId: string | null }> {
  const parsed = parseWhatsAppWebhookPayload(input.payload);
  const config = await resolveWhatsAppMailbox({
    tenantId: input.tenantId,
    phoneNumberId: parsed.phoneNumberId || undefined,
  });

  if (!config) {
    return {
      provider: "whatsapp",
      mailbox: parsed.displayPhoneNumber || "unknown",
      fetched: parsed.messages.length,
      createdTickets: 0,
      appendedMessages: 0,
      skipped: parsed.messages.length,
      errors: ["WhatsApp mailbox is not configured"],
      phoneNumberId: parsed.phoneNumberId,
    };
  }

  if (parsed.messages.length === 0) {
    return {
      provider: "whatsapp",
      mailbox: config.displayNumber,
      fetched: 0,
      createdTickets: 0,
      appendedMessages: 0,
      skipped: 0,
      errors: [],
      phoneNumberId: parsed.phoneNumberId || config.phoneNumberId,
    };
  }

  const tenantId = await resolveHelpdeskTenantId(input.tenantId);
  const result = await ingestInboundEmails({
    provider: "whatsapp",
    mailboxAddress: config.displayNumber,
    tenantId,
    messages: parsed.messages.map((m) => ({
      ...m,
      toEmails: m.toEmails || config.displayNumber,
    })),
    channel: "whatsapp",
  });

  return { ...result, phoneNumberId: parsed.phoneNumberId || config.phoneNumberId };
}

export async function sendWhatsAppTextMessage(input: {
  toPhone: string;
  text: string;
  mailboxId?: number | null;
  tenantId?: number;
}): Promise<{ messageId: string; from: string }> {
  const config = await resolveWhatsAppMailbox({ tenantId: input.tenantId });
  if (!config?.accessToken || !config.phoneNumberId) {
    throw new Error("WhatsApp is not configured — set Channel Configuration → WhatsApp");
  }

  if (input.mailboxId && config.mailboxId && input.mailboxId !== config.mailboxId) {
    const db = getHelpdeskDb();
    const box = await db.helpdeskMailbox.findUnique({ where: { mailboxId: input.mailboxId } });
    if (box?.provider === "whatsapp") {
      const creds = decryptMailboxCredentials(box.credentialsEnc);
      if (creds.waAccessToken && creds.waPhoneNumberId) {
        config.accessToken = creds.waAccessToken;
        config.phoneNumberId = creds.waPhoneNumberId;
        config.displayNumber = normalizeWhatsAppPhone(box.mailboxAddress);
      }
    }
  }

  const to = whatsAppToDigits(input.toPhone);
  if (!to) throw new Error("Invalid WhatsApp recipient phone");

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body: input.text.slice(0, 4096) },
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(body.error?.message || `WhatsApp send failed (${res.status})`);
  }

  const messageId = body.messages?.[0]?.id;
  if (!messageId) throw new Error("WhatsApp send succeeded but no message id returned");

  return { messageId, from: config.displayNumber };
}

export { GRAPH_API_VERSION };
