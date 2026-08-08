import { getAdminDb, getHelpdeskDb } from "@/lib/db";

export type HelpdeskEmailSyncResult = {
  provider: string;
  mailbox: string;
  fetched: number;
  createdTickets: number;
  appendedMessages: number;
  skipped: number;
  errors: string[];
};

export type InboundEmailMessage = {
  /** Provider-unique id (Graph message id, or Gmail UID / Message-ID). */
  externalId: string;
  conversationId: string | null;
  internetMessageId: string | null;
  subject: string;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string | null;
  bodyPreview: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  receivedAt: Date;
};

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function resolveHelpdeskTenantId(explicit?: number): Promise<number> {
  if (explicit && explicit > 0) return explicit;
  const fromEnv = Number(process.env.HELPDESK_DEFAULT_TENANT_ID ?? "");
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  const admin = getAdminDb();
  const first = await admin.tenant.findFirst({ orderBy: { tenantId: "asc" }, select: { tenantId: true } });
  if (!first) throw new Error("No tenant found — seed tenants first or set HELPDESK_DEFAULT_TENANT_ID");
  return first.tenantId;
}

async function nextTicketNumber(tenantId: number): Promise<string> {
  const db = getHelpdeskDb();
  const year = new Date().getFullYear();
  const prefix = `HD-${year}-`;
  const latest = await db.helpdeskTicket.findFirst({
    where: { tenantId, ticketNumber: { startsWith: prefix } },
    orderBy: { ticketId: "desc" },
    select: { ticketNumber: true },
  });
  const lastSeq = latest?.ticketNumber?.split("-").pop();
  const next = (lastSeq && Number.isFinite(Number(lastSeq)) ? Number(lastSeq) : 0) + 1;
  return `${prefix}${String(next).padStart(5, "0")}`;
}

export async function ensureHelpdeskMailbox(input: {
  tenantId: number;
  address: string;
  provider: string;
  isShared?: boolean;
}) {
  const db = getHelpdeskDb();
  const address = input.address.trim().toLowerCase();
  return db.helpdeskMailbox.upsert({
    where: {
      tenantId_mailboxAddress: { tenantId: input.tenantId, mailboxAddress: address },
    },
    create: {
      tenantId: input.tenantId,
      mailboxAddress: address,
      displayName: address,
      provider: input.provider,
      isShared: input.isShared ?? false,
      isActive: true,
    },
    update: { isActive: true, provider: input.provider },
  });
}

/** Upsert inbound emails into tickets. Same conversationId → same ticket (replies append). */
export async function ingestInboundEmails(input: {
  provider: string;
  mailboxAddress: string;
  tenantId: number;
  messages: InboundEmailMessage[];
}): Promise<HelpdeskEmailSyncResult> {
  const db = getHelpdeskDb();
  const result: HelpdeskEmailSyncResult = {
    provider: input.provider,
    mailbox: input.mailboxAddress,
    fetched: input.messages.length,
    createdTickets: 0,
    appendedMessages: 0,
    skipped: 0,
    errors: [],
  };

  const mailboxRow = await ensureHelpdeskMailbox({
    tenantId: input.tenantId,
    address: input.mailboxAddress,
    provider: input.provider,
  });

  for (const msg of input.messages) {
    try {
      if (!msg.externalId) {
        result.skipped += 1;
        continue;
      }

      const existingMsg = await db.helpdeskTicketMessage.findUnique({
        where: { graphMessageId: msg.externalId },
        select: { ticketMessageId: true },
      });
      if (existingMsg) {
        result.skipped += 1;
        continue;
      }

      const subject = (msg.subject || "(no subject)").trim().slice(0, 500);
      const conversationId = msg.conversationId?.trim() || null;

      let ticket =
        conversationId != null
          ? await db.helpdeskTicket.findFirst({
              where: { mailboxId: mailboxRow.mailboxId, conversationId },
            })
          : null;

      // Fallback: match by In-Reply-To / References already resolved into conversationId by provider.
      // If still no thread, try finding prior message by internetMessageId referenced as conversation.
      if (!ticket && msg.internetMessageId) {
        // no-op — providers should set conversationId
      }

      if (!ticket) {
        const ticketNumber = await nextTicketNumber(input.tenantId);
        ticket = await db.helpdeskTicket.create({
          data: {
            tenantId: input.tenantId,
            mailboxId: mailboxRow.mailboxId,
            ticketNumber,
            subject,
            status: "open",
            priority: "normal",
            channel: "email",
            requesterName: msg.fromName,
            requesterEmail: msg.fromEmail,
            conversationId,
            lastMessageAt: msg.receivedAt,
            isActive: true,
          },
        });
        result.createdTickets += 1;
      } else {
        await db.helpdeskTicket.update({
          where: { ticketId: ticket.ticketId },
          data: {
            lastMessageAt: msg.receivedAt,
            status: ticket.status === "closed" ? "open" : ticket.status,
            modifiedDtTm: new Date(),
          },
        });
        result.appendedMessages += 1;
      }

      await db.helpdeskTicketMessage.create({
        data: {
          ticketId: ticket.ticketId,
          graphMessageId: msg.externalId,
          internetMessageId: msg.internetMessageId,
          direction: "inbound",
          fromName: msg.fromName,
          fromEmail: msg.fromEmail,
          toEmails: msg.toEmails,
          subject,
          bodyPreview: (msg.bodyPreview ?? "").slice(0, 1000) || null,
          bodyHtml: msg.bodyHtml,
          bodyText: msg.bodyText,
          receivedAt: msg.receivedAt,
        },
      });
    } catch (err) {
      result.errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  await db.helpdeskMailbox.update({
    where: { mailboxId: mailboxRow.mailboxId },
    data: { lastSyncAt: new Date(), modifiedDtTm: new Date() },
  });

  return result;
}

export function getHelpdeskEmailProvider(): "gmail" | "microsoft365" {
  const raw = (process.env.HELPDESK_EMAIL_PROVIDER ?? "gmail").trim().toLowerCase();
  if (raw === "microsoft365" || raw === "ms365" || raw === "outlook") return "microsoft365";
  return "gmail";
}

export function syncLookbackHours(envKey: string): number {
  const n = Number(process.env[envKey] ?? process.env.HELPDESK_SYNC_LOOKBACK_HOURS ?? 72);
  return Number.isFinite(n) && n > 0 ? n : 72;
}
