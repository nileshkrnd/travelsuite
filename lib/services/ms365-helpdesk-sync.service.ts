import {
  ingestInboundEmails,
  resolveHelpdeskTenantId,
  stripHtml,
  syncLookbackHours,
  type HelpdeskEmailSyncResult,
  type InboundEmailMessage,
} from "@/lib/services/helpdesk-email-ingest.service";

type GraphEmailAddress = { name?: string; address?: string };
type GraphRecipient = { emailAddress?: GraphEmailAddress };
type GraphMessage = {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  body?: { contentType?: string; content?: string };
  from?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  isDraft?: boolean;
};

export type Ms365SyncConfig = {
  tenantId?: number;
  mailboxAddress: string;
  ms365TenantId?: string;
  ms365ClientId?: string;
  ms365ClientSecret?: string;
  lookbackHours?: number;
  mode?: "quick" | "full";
  lastSyncAt?: Date | string | null;
};

async function getGraphToken(cfg: {
  ms365TenantId: string;
  ms365ClientId: string;
  ms365ClientSecret: string;
}): Promise<string> {
  const body = new URLSearchParams({
    client_id: cfg.ms365ClientId,
    client_secret: cfg.ms365ClientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${cfg.ms365TenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft token request failed (${res.status}): ${text.slice(0, 400)}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("Microsoft token response missing access_token");
  return json.access_token;
}

async function fetchInboxMessages(
  token: string,
  mailbox: string,
  sinceIso: string,
  options?: { top?: number; newestFirst?: boolean }
): Promise<GraphMessage[]> {
  const select =
    "id,conversationId,internetMessageId,subject,bodyPreview,body,from,toRecipients,receivedDateTime,isDraft";
  const filter = `receivedDateTime ge ${sinceIso} and isDraft eq false`;
  const top = options?.top ?? 50;
  const order = options?.newestFirst ? "receivedDateTime desc" : "receivedDateTime asc";
  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/mailFolders/Inbox/messages` +
    `?$select=${select}&$filter=${encodeURIComponent(filter)}&$orderby=${order}&$top=${top}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph inbox fetch failed (${res.status}): ${text.slice(0, 500)}`);
  }

  const json = (await res.json()) as { value?: GraphMessage[] };
  return json.value ?? [];
}

/** Microsoft 365 Graph sync. Same conversationId → one ticket. */
export async function syncMs365MailboxToTickets(
  options?: Ms365SyncConfig
): Promise<HelpdeskEmailSyncResult> {
  const mailbox = (
    options?.mailboxAddress ||
    process.env.MS365_MAILBOX ||
    ""
  )
    .trim()
    .toLowerCase();
  if (!mailbox) throw new Error("Microsoft 365 mailbox address is required");

  const ms365TenantId = options?.ms365TenantId || process.env.MS365_TENANT_ID || "";
  const ms365ClientId = options?.ms365ClientId || process.env.MS365_CLIENT_ID || "";
  const ms365ClientSecret = options?.ms365ClientSecret || process.env.MS365_CLIENT_SECRET || "";
  if (!ms365TenantId || !ms365ClientId || !ms365ClientSecret) {
    throw new Error(`Missing Microsoft 365 credentials for mailbox ${mailbox}`);
  }

  const tenantId = await resolveHelpdeskTenantId(options?.tenantId);
  const mode = options?.mode ?? "full";
  const lookbackHours = options?.lookbackHours ?? syncLookbackHours("MS365_SYNC_LOOKBACK_HOURS");
  let since: Date;
  let top = 50;
  if (mode === "quick") {
    const lastSync = options?.lastSyncAt ? new Date(options.lastSyncAt) : null;
    const quickFloor = new Date(Date.now() - 6 * 60 * 60 * 1000);
    if (lastSync && !Number.isNaN(lastSync.getTime())) {
      since = new Date(Math.max(quickFloor.getTime(), lastSync.getTime() - 5 * 60 * 1000));
    } else {
      since = quickFloor;
    }
    top = 40;
  } else {
    since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
  }

  const token = await getGraphToken({ ms365TenantId, ms365ClientId, ms365ClientSecret });
  const messages = await fetchInboxMessages(token, mailbox, since.toISOString(), {
    top,
    newestFirst: mode === "quick",
  });

  const inbound: InboundEmailMessage[] = [];
  for (const msg of messages) {
    if (!msg.id || msg.isDraft) continue;
    const fromEmail = msg.from?.emailAddress?.address?.trim() || null;
    const fromName = msg.from?.emailAddress?.name?.trim() || null;
    const toEmails =
      (msg.toRecipients ?? [])
        .map((r) => r.emailAddress?.address)
        .filter((a): a is string => !!a)
        .join(", ") || null;
    const bodyHtml =
      msg.body?.contentType?.toLowerCase() === "html" ? (msg.body.content ?? null) : null;
    const bodyText =
      msg.body?.contentType?.toLowerCase() === "text"
        ? (msg.body.content ?? null)
        : bodyHtml
          ? stripHtml(bodyHtml).slice(0, 20000)
          : (msg.bodyPreview ?? null);

    inbound.push({
      externalId: msg.id,
      conversationId: msg.conversationId?.trim() || null,
      internetMessageId: msg.internetMessageId ?? null,
      subject: msg.subject ?? "(no subject)",
      fromName,
      fromEmail,
      toEmails,
      bodyPreview: (msg.bodyPreview ?? "").slice(0, 1000) || null,
      bodyHtml,
      bodyText,
      receivedAt: msg.receivedDateTime ? new Date(msg.receivedDateTime) : new Date(),
    });
  }

  return ingestInboundEmails({
    provider: "microsoft365",
    mailboxAddress: mailbox,
    tenantId,
    messages: inbound,
  });
}
