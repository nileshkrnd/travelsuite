import { NextResponse } from "next/server";
import { syncHelpdeskMailboxToTickets } from "@/lib/services/helpdesk-email-sync.service";
import { dbUnavailable } from "@/lib/api/db-error";

/**
 * Sync all active tenant mailboxes → helpdesk tickets.
 * Uses Helpdesk Mailbox master; falls back to .env when none configured.
 * Thread replies merge into one ticket per conversation.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const expected = process.env.HELPDESK_SYNC_SECRET?.trim();
    if (expected) {
      const header = request.headers.get("x-helpdesk-sync-secret") ?? "";
      const fromBody =
        body && typeof body === "object" && "secret" in body
          ? String((body as { secret?: string }).secret ?? "")
          : "";
      if (header !== expected && fromBody !== expected) {
        return NextResponse.json({ error: "Unauthorized sync" }, { status: 401 });
      }
    }

    const tenantId =
      body && typeof body === "object" && "tenantId" in body
        ? Number((body as { tenantId?: number }).tenantId)
        : undefined;

    const result = await syncHelpdeskMailboxToTickets({
      tenantId: Number.isFinite(tenantId) && (tenantId as number) > 0 ? tenantId : undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      /Missing (GMAIL_|MS365_|HELPDESK_)|Microsoft token|Graph inbox|IMAP|AUTHENTICATIONFAILED|Invalid credentials/i.test(
        error.message
      )
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return dbUnavailable(error);
  }
}
