import type { HelpdeskTicket } from "@/types/helpdesk";

/** First-response SLA hours by priority (Ops MVP defaults). */
export const HELPDESK_FIRST_RESPONSE_SLA_HOURS: Record<string, number> = {
  urgent: 1,
  high: 4,
  normal: 8,
  low: 24,
};

export type HelpdeskWaitingParty = "us" | "customer" | null;

export function isTicketOpenForQueue(status: string): boolean {
  return status !== "resolved" && status !== "closed";
}

/** Pending on us = customer sent the last public message, ticket still active. */
export function isPendingOnUs(ticket: Pick<HelpdeskTicket, "status" | "lastActivityDirection">): boolean {
  return isTicketOpenForQueue(ticket.status) && ticket.lastActivityDirection === "inbound";
}

export function waitingParty(
  ticket: Pick<HelpdeskTicket, "status" | "lastActivityDirection">
): HelpdeskWaitingParty {
  if (!isTicketOpenForQueue(ticket.status)) return null;
  if (ticket.lastActivityDirection === "inbound") return "us";
  if (ticket.lastActivityDirection === "outbound") return "customer";
  return null;
}

export function firstResponseSlaHours(priority: string): number {
  return HELPDESK_FIRST_RESPONSE_SLA_HOURS[priority] ?? HELPDESK_FIRST_RESPONSE_SLA_HOURS.normal;
}

export type FirstResponseSla = {
  dueAt: Date;
  hours: number;
  met: boolean;
  breached: boolean;
  remainingMs: number;
};

/** First-response SLA from ticket open time until first agent reply. */
export function getFirstResponseSla(
  ticket: Pick<HelpdeskTicket, "createdDtTm" | "priority" | "hasAgentReply" | "status">,
  now: Date = new Date()
): FirstResponseSla | null {
  if (!isTicketOpenForQueue(ticket.status)) return null;
  const hours = firstResponseSlaHours(ticket.priority);
  const created = new Date(ticket.createdDtTm);
  if (Number.isNaN(created.getTime())) return null;
  const dueAt = new Date(created.getTime() + hours * 60 * 60 * 1000);
  const met = !!ticket.hasAgentReply;
  const remainingMs = dueAt.getTime() - now.getTime();
  return {
    dueAt,
    hours,
    met,
    breached: !met && remainingMs < 0,
    remainingMs,
  };
}

/** Mailbox sync considered stale after this many minutes without a successful sync. */
export const HELPDESK_SYNC_STALE_MINUTES = 15;

export type MailboxSyncHealth = "healthy" | "stale" | "never" | "missing_credentials" | "error" | "inactive";

export function getMailboxSyncHealth(mailbox: {
  isActive: boolean;
  hasCredentials: boolean;
  lastSyncAt: string | null;
  lastSyncError?: string | null;
}): MailboxSyncHealth {
  if (!mailbox.isActive) return "inactive";
  if (!mailbox.hasCredentials) return "missing_credentials";
  if (mailbox.lastSyncError) return "error";
  if (!mailbox.lastSyncAt) return "never";
  const ageMs = Date.now() - new Date(mailbox.lastSyncAt).getTime();
  if (!Number.isFinite(ageMs) || ageMs > HELPDESK_SYNC_STALE_MINUTES * 60 * 1000) return "stale";
  return "healthy";
}
