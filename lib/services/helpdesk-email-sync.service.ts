import { getHelpdeskDb } from "@/lib/db";
import { decryptMailboxCredentials } from "@/lib/helpdesk-credentials";
import {
  resolveHelpdeskTenantId,
  type HelpdeskEmailSyncResult,
} from "@/lib/services/helpdesk-email-ingest.service";
import { syncGmailMailboxToTickets } from "@/lib/services/gmail-helpdesk-sync.service";
import { syncMs365MailboxToTickets } from "@/lib/services/ms365-helpdesk-sync.service";

export type HelpdeskEmailSyncBatchResult = HelpdeskEmailSyncResult & {
  mailboxesSynced: number;
  results: HelpdeskEmailSyncResult[];
};

function emptyResult(provider: string, mailbox: string): HelpdeskEmailSyncResult {
  return {
    provider,
    mailbox,
    fetched: 0,
    createdTickets: 0,
    appendedMessages: 0,
    skipped: 0,
    errors: [],
  };
}

/** Sync all active Tenant Admin mailboxes (falls back to .env if none configured). */
export async function syncHelpdeskMailboxToTickets(options?: {
  tenantId?: number;
  /** quick = auto-poll newest only; full = manual deep sync */
  mode?: "quick" | "full";
}): Promise<HelpdeskEmailSyncBatchResult> {
  const tenantId = await resolveHelpdeskTenantId(options?.tenantId);
  const mode = options?.mode ?? "full";
  const db = getHelpdeskDb();
  const mailboxes = await db.helpdeskMailbox.findMany({
    where: { tenantId, isActive: true },
    orderBy: { mailboxId: "asc" },
  });

  const results: HelpdeskEmailSyncResult[] = [];

  if (mailboxes.length === 0) {
    // Legacy .env bootstrap until Tenant Admin creates mailbox master rows.
    const provider = (process.env.HELPDESK_EMAIL_PROVIDER ?? "gmail").trim().toLowerCase();
    try {
      if (provider === "microsoft365" || provider === "ms365" || provider === "outlook") {
        results.push(
          await syncMs365MailboxToTickets({
            tenantId,
            mailboxAddress: process.env.MS365_MAILBOX || "",
            mode,
          })
        );
      } else {
        results.push(
          await syncGmailMailboxToTickets({
            tenantId,
            mailboxAddress: process.env.GMAIL_USER || "",
            appPassword: process.env.GMAIL_APP_PASSWORD || "",
            mode,
          })
        );
      }
    } catch (err) {
      results.push({
        ...emptyResult(provider, process.env.GMAIL_USER || process.env.MS365_MAILBOX || "env"),
        errors: [err instanceof Error ? err.message : String(err)],
      });
    }
  } else {
    for (const box of mailboxes) {
      // WhatsApp (and future non-email channels) use webhooks — never IMAP/Graph sync.
      if (box.provider !== "gmail" && box.provider !== "microsoft365") {
        continue;
      }
      try {
        const creds = decryptMailboxCredentials(box.credentialsEnc);
        if (box.provider === "microsoft365") {
          results.push(
            await syncMs365MailboxToTickets({
              tenantId,
              mailboxAddress: box.mailboxAddress,
              ms365TenantId: creds.ms365TenantId || "",
              ms365ClientId: creds.ms365ClientId || "",
              ms365ClientSecret: creds.ms365ClientSecret || "",
              lookbackHours: box.syncLookbackHours,
              mode,
              lastSyncAt: box.lastSyncAt,
            })
          );
        } else {
          results.push(
            await syncGmailMailboxToTickets({
              tenantId,
              mailboxAddress: box.mailboxAddress,
              appPassword: creds.appPassword || "",
              imapHost: box.imapHost,
              imapPort: box.imapPort,
              lookbackHours: box.syncLookbackHours,
              mode,
              lastSyncAt: box.lastSyncAt,
            })
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          ...emptyResult(box.provider, box.mailboxAddress),
          errors: [message],
        });
        await db.helpdeskMailbox.update({
          where: { mailboxId: box.mailboxId },
          data: {
            lastSyncError: message.slice(0, 1000),
            modifiedDtTm: new Date(),
          },
        });
      }
    }
  }

  return {
    provider: "multi",
    mailbox: results.map((r) => r.mailbox).join(", ") || "(none)",
    fetched: results.reduce((s, r) => s + r.fetched, 0),
    createdTickets: results.reduce((s, r) => s + r.createdTickets, 0),
    appendedMessages: results.reduce((s, r) => s + r.appendedMessages, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
    errors: results.flatMap((r) => r.errors),
    mailboxesSynced: results.length,
    results,
  };
}
