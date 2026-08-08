import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  ingestInboundEmails,
  resolveHelpdeskTenantId,
  stripHtml,
  type HelpdeskEmailSyncResult,
  type InboundEmailMessage,
} from "@/lib/services/helpdesk-email-ingest.service";

function addressList(
  value:
    | { text?: string; value?: Array<{ name?: string; address?: string }> }
    | Array<{ text?: string; value?: Array<{ name?: string; address?: string }> }>
    | undefined
): { name: string | null; email: string | null; joined: string | null } {
  if (!value) return { name: null, email: null, joined: null };
  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj) return { name: null, email: null, joined: null };
  const first = obj.value?.[0];
  const joined =
    obj.value
      ?.map((a) => a.address)
      .filter((a): a is string => !!a)
      .join(", ") || null;
  return {
    name: first?.name?.trim() || null,
    email: first?.address?.trim().toLowerCase() || null,
    joined,
  };
}

function normalizeMessageId(id: string | undefined | null): string | null {
  if (!id) return null;
  return id.trim().replace(/^<|>$/g, "");
}

export type GmailSyncConfig = {
  tenantId?: number;
  mailboxAddress: string;
  appPassword: string;
  imapHost?: string | null;
  imapPort?: number | null;
  lookbackHours?: number;
};

/**
 * Gmail IMAP sync (App Password).
 * Threading via In-Reply-To / References / Message-ID.
 */
export async function syncGmailMailboxToTickets(
  options?: GmailSyncConfig
): Promise<HelpdeskEmailSyncResult> {
  const user = (
    options?.mailboxAddress ||
    process.env.GMAIL_USER ||
    ""
  )
    .trim()
    .toLowerCase();
  const pass = (options?.appPassword || process.env.GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
  if (!user) throw new Error("Gmail mailbox address is required");
  if (!pass) throw new Error(`Missing App Password for mailbox ${user}`);

  const host = (options?.imapHost || process.env.GMAIL_IMAP_HOST || "imap.gmail.com").trim();
  const port = Number(options?.imapPort || process.env.GMAIL_IMAP_PORT || 993);
  const tenantId = await resolveHelpdeskTenantId(options?.tenantId);
  const lookbackHours =
    options?.lookbackHours ??
    Number(process.env.GMAIL_SYNC_LOOKBACK_HOURS || process.env.HELPDESK_SYNC_LOOKBACK_HOURS || 720) ||
    720;
  const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  const maxMessages = Math.min(
    200,
    Math.max(1, Number(process.env.GMAIL_SYNC_MAX_MESSAGES ?? 50) || 50)
  );

  const client = new ImapFlow({
    host,
    port: Number.isFinite(port) ? port : 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const inbound: InboundEmailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      let usedFallbackAll = false;
      let uids = await client.search({ since }, { uid: true });
      let list = Array.isArray(uids) ? uids : [];

      if (list.length === 0) {
        usedFallbackAll = true;
        const all = await client.search({ all: true }, { uid: true });
        list = Array.isArray(all) ? all : [];
      }

      const limited = list.slice(-maxMessages);
      if (limited.length === 0) {
        return ingestInboundEmails({
          provider: "gmail",
          mailboxAddress: user,
          tenantId,
          messages: [],
        });
      }

      for await (const msg of client.fetch(
        limited,
        {
          uid: true,
          source: true,
          envelope: true,
          internalDate: true,
        },
        { uid: true }
      )) {
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(Buffer.from(msg.source));
          const receivedAt =
            msg.internalDate instanceof Date
              ? msg.internalDate
              : parsed.date instanceof Date
                ? parsed.date
                : new Date();

          if (usedFallbackAll && receivedAt < since) continue;

          const internetMessageId =
            normalizeMessageId(parsed.messageId) ||
            normalizeMessageId(msg.envelope?.messageId) ||
            null;

          const inReplyTo = normalizeMessageId(
            Array.isArray(parsed.inReplyTo) ? parsed.inReplyTo[0] : parsed.inReplyTo
          );
          const references = Array.isArray(parsed.references)
            ? parsed.references.map((r) => normalizeMessageId(String(r))).filter((r): r is string => !!r)
            : parsed.references
              ? [normalizeMessageId(String(parsed.references))].filter((r): r is string => !!r)
              : [];

          const conversationId =
            references[0] || inReplyTo || internetMessageId || `gmail-uid-${msg.uid}`;

          const from = addressList(parsed.from);
          const to = addressList(parsed.to);
          const html = typeof parsed.html === "string" ? parsed.html : null;
          const text =
            typeof parsed.text === "string"
              ? parsed.text
              : html
                ? stripHtml(html).slice(0, 20000)
                : null;

          inbound.push({
            externalId: internetMessageId
              ? `gmail:${internetMessageId}`
              : `gmail-uid:${user}:${msg.uid}`,
            conversationId,
            internetMessageId,
            subject: parsed.subject || msg.envelope?.subject || "(no subject)",
            fromName: from.name,
            fromEmail: from.email,
            toEmails: to.joined,
            bodyPreview: (text ?? "").slice(0, 1000) || null,
            bodyHtml: html,
            bodyText: text,
            receivedAt,
          });
        } catch {
          /* skip corrupt */
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  }

  inbound.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

  return ingestInboundEmails({
    provider: "gmail",
    mailboxAddress: user,
    tenantId,
    messages: inbound,
  });
}
