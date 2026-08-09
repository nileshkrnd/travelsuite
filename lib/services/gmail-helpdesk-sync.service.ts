import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { getHelpdeskDb } from "@/lib/db";
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
  /**
   * quick — poll newest mail only (auto-refresh).
   * full — wider lookback (manual Sync button).
   */
  mode?: "quick" | "full";
  /** When set, quick mode searches from slightly before this time. */
  lastSyncAt?: Date | string | null;
};

/**
 * Gmail IMAP sync (App Password).
 * Threading via In-Reply-To / References / Message-ID.
 *
 * Fast path: fetch envelopes first, download full bodies only for messages
 * not already in Helpdesk — so 10s auto-poll stays cheap.
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
  const mode = options?.mode ?? "full";

  const envLookbackHours = Number(
    process.env.GMAIL_SYNC_LOOKBACK_HOURS || process.env.HELPDESK_SYNC_LOOKBACK_HOURS || 720
  );
  const fullLookbackHours = options?.lookbackHours ?? (envLookbackHours || 720);

  let since: Date;
  let maxMessages: number;
  if (mode === "quick") {
    const lastSync = options?.lastSyncAt ? new Date(options.lastSyncAt) : null;
    const quickFloor = new Date(Date.now() - 6 * 60 * 60 * 1000); // last 6h
    if (lastSync && !Number.isNaN(lastSync.getTime())) {
      // Overlap a few minutes so we do not miss mail that arrived during the previous sync.
      since = new Date(Math.max(quickFloor.getTime(), lastSync.getTime() - 5 * 60 * 1000));
    } else {
      since = quickFloor;
    }
    maxMessages = Math.min(
      80,
      Math.max(1, Number(process.env.GMAIL_SYNC_QUICK_MAX_MESSAGES ?? 40) || 40)
    );
  } else {
    since = new Date(Date.now() - fullLookbackHours * 60 * 60 * 1000);
    maxMessages = Math.min(
      500,
      Math.max(1, Number(process.env.GMAIL_SYNC_MAX_MESSAGES ?? 200) || 200)
    );
  }

  const client = new ImapFlow({
    host,
    port: Number.isFinite(port) ? port : 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const inbound: InboundEmailMessage[] = [];
  let scanned = 0;
  let alreadyKnown = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      let usedFallbackAll = false;
      let uids = await client.search({ since }, { uid: true });
      let list = Array.isArray(uids) ? uids : [];

      if (list.length === 0 && mode === "full") {
        usedFallbackAll = true;
        const all = await client.search({ all: true }, { uid: true });
        list = Array.isArray(all) ? all : [];
      }

      const limited = list.slice(-maxMessages);
      scanned = limited.length;
      if (limited.length === 0) {
        return ingestInboundEmails({
          provider: "gmail",
          mailboxAddress: user,
          tenantId,
          messages: [],
        });
      }

      type Candidate = {
        uid: number;
        externalId: string;
        internetMessageId: string | null;
        subject: string;
        fromName: string | null;
        fromEmail: string | null;
        receivedAt: Date;
      };

      const candidates: Candidate[] = [];
      for await (const msg of client.fetch(
        limited,
        {
          uid: true,
          envelope: true,
          internalDate: true,
        },
        { uid: true }
      )) {
        const receivedAt =
          msg.internalDate instanceof Date ? msg.internalDate : new Date();
        if (usedFallbackAll && receivedAt < since) continue;

        const internetMessageId = normalizeMessageId(msg.envelope?.messageId) || null;
        const externalId = internetMessageId
          ? `gmail:${internetMessageId}`
          : `gmail-uid:${user}:${msg.uid}`;

        const from = msg.envelope?.from?.[0];
        candidates.push({
          uid: msg.uid,
          externalId,
          internetMessageId,
          subject: msg.envelope?.subject || "(no subject)",
          fromName: from?.name?.trim() || null,
          fromEmail: from?.address?.trim().toLowerCase() || null,
          receivedAt,
        });
      }

      const db = getHelpdeskDb();
      const existing =
        candidates.length === 0
          ? []
          : await db.helpdeskTicketMessage.findMany({
              where: { graphMessageId: { in: candidates.map((c) => c.externalId) } },
              select: { graphMessageId: true },
            });
      const known = new Set(existing.map((e) => e.graphMessageId).filter(Boolean) as string[]);
      const needFetch = candidates.filter((c) => !known.has(c.externalId));
      alreadyKnown = candidates.length - needFetch.length;

      if (needFetch.length === 0) {
        const result = await ingestInboundEmails({
          provider: "gmail",
          mailboxAddress: user,
          tenantId,
          messages: [],
        });
        return {
          ...result,
          fetched: scanned,
          skipped: alreadyKnown,
        };
      }

      const byUid = new Map(needFetch.map((c) => [c.uid, c]));
      for await (const msg of client.fetch(
        needFetch.map((c) => c.uid),
        {
          uid: true,
          source: true,
          envelope: true,
          internalDate: true,
        },
        { uid: true }
      )) {
        try {
          if (!msg.source || msg.uid == null) continue;
          const meta = byUid.get(msg.uid);
          const parsed = await simpleParser(Buffer.from(msg.source));
          const receivedAt =
            msg.internalDate instanceof Date
              ? msg.internalDate
              : parsed.date instanceof Date
                ? parsed.date
                : meta?.receivedAt ?? new Date();

          const internetMessageId =
            normalizeMessageId(parsed.messageId) ||
            normalizeMessageId(msg.envelope?.messageId) ||
            meta?.internetMessageId ||
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
            subject: parsed.subject || msg.envelope?.subject || meta?.subject || "(no subject)",
            fromName: from.name || meta?.fromName || null,
            fromEmail: from.email || meta?.fromEmail || null,
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

  const result = await ingestInboundEmails({
    provider: "gmail",
    mailboxAddress: user,
    tenantId,
    messages: inbound,
  });

  return {
    ...result,
    fetched: scanned,
    skipped: result.skipped + alreadyKnown,
  };
}
