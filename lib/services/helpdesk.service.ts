import type { HelpdeskTicket } from "@/types/helpdesk";
import { toAppTicket } from "@/lib/mappers/helpdesk.mapper";

export class HelpdeskApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "HelpdeskApiError";
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? res.statusText;
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listHelpdeskTickets(options?: {
  tenantId?: number;
  status?: string;
  priority?: string;
  channel?: string;
  departmentId?: number;
  assigneeUserId?: number;
}): Promise<HelpdeskTicket[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.status) params.set("status", options.status);
  if (options?.priority) params.set("priority", options.priority);
  if (options?.channel) params.set("channel", options.channel);
  if (options?.departmentId !== undefined) params.set("departmentId", String(options.departmentId));
  if (options?.assigneeUserId !== undefined) {
    params.set("assigneeUserId", String(options.assigneeUserId));
  }
  const qs = params.toString();
  const res = await fetch(`/api/helpdesk/tickets${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new HelpdeskApiError(await parseError(res), res.status);
  return ((await res.json()) as Parameters<typeof toAppTicket>[0][]).map(toAppTicket);
}

export async function getHelpdeskTicket(ticketId: number): Promise<HelpdeskTicket> {
  const res = await fetch(`/api/helpdesk/tickets/${ticketId}`, { cache: "no-store" });
  if (!res.ok) throw new HelpdeskApiError(await parseError(res), res.status);
  return toAppTicket(await res.json());
}

export async function syncHelpdeskMailbox(options?: {
  tenantId?: number;
  /** quick = auto-poll (default for timers); full = manual Sync mailbox */
  mode?: "quick" | "full";
}): Promise<{
  provider: string;
  mailbox: string;
  fetched: number;
  createdTickets: number;
  appendedMessages: number;
  skipped: number;
  errors: string[];
  mailboxesSynced?: number;
}> {
  const res = await fetch("/api/helpdesk/email/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenantId: options?.tenantId,
      mode: options?.mode ?? "full",
    }),
  });
  if (!res.ok) throw new HelpdeskApiError(await parseError(res), res.status);
  return res.json();
}

export async function updateHelpdeskTicket(
  ticketId: number,
  input: {
    status?: string;
    priority?: string;
    departmentId?: number | null;
    assigneeUserId?: number | null;
    modifiedBy?: number;
  }
): Promise<HelpdeskTicket> {
  const res = await fetch(`/api/helpdesk/tickets/${ticketId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new HelpdeskApiError(await parseError(res), res.status);
  return toAppTicket(await res.json());
}

/** @deprecated use updateHelpdeskTicket */
export async function updateHelpdeskTicketStatus(
  ticketId: number,
  status: string
): Promise<HelpdeskTicket> {
  return updateHelpdeskTicket(ticketId, { status });
}

export async function postHelpdeskTicketMessage(
  ticketId: number,
  input: {
    kind: "reply" | "note";
    bodyText: string;
    bodyHtml?: string | null;
    createdBy?: number;
  }
): Promise<HelpdeskTicket> {
  const res = await fetch(`/api/helpdesk/tickets/${ticketId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new HelpdeskApiError(await parseError(res), res.status);
  return toAppTicket(await res.json());
}
