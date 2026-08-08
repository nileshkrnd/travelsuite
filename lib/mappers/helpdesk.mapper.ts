import type { HelpdeskTicket, HelpdeskTicketMessage } from "@/types/helpdesk";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppTicketMessage(row: {
  ticketMessageId: number;
  ticketId: number;
  graphMessageId: string | null;
  internetMessageId: string | null;
  direction: string;
  isInternal?: boolean;
  createdBy?: number | null;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string | null;
  subject: string | null;
  bodyPreview: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  receivedAt: Date | string | null;
  createdDtTm: Date | string;
}): HelpdeskTicketMessage {
  return {
    ticketMessageId: row.ticketMessageId,
    ticketId: row.ticketId,
    graphMessageId: row.graphMessageId,
    internetMessageId: row.internetMessageId,
    direction: row.direction as HelpdeskTicketMessage["direction"],
    isInternal: row.isInternal ?? row.direction === "note",
    createdBy: row.createdBy ?? null,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    toEmails: row.toEmails,
    subject: row.subject,
    bodyPreview: row.bodyPreview,
    bodyHtml: row.bodyHtml,
    bodyText: row.bodyText,
    receivedAt: toIso(row.receivedAt),
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
  };
}

type LastActivity = {
  direction: string;
  fromName: string | null;
  fromEmail: string | null;
  isInternal?: boolean;
  receivedAt?: Date | string | null;
  createdDtTm?: Date | string;
};

export function toAppTicket(row: {
  ticketId: number;
  tenantId: number;
  companyId: number | null;
  mailboxId: number | null;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  channel: string;
  requesterName: string | null;
  requesterEmail: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  assigneeUserId?: number | null;
  assigneeName?: string | null;
  conversationId: string | null;
  lastMessageAt: Date | string | null;
  isActive: boolean;
  createdBy: number | null;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  messages?: Array<Parameters<typeof toAppTicketMessage>[0] | LastActivity>;
  _count?: {
    messages: number;
  };
  inboundCount?: number;
  outboundCount?: number;
  lastActivity?: LastActivity | null;
  mailbox?: { mailboxAddress: string } | null;
}): HelpdeskTicket {
  const fullMessages = (row.messages ?? []).filter(
    (m): m is Parameters<typeof toAppTicketMessage>[0] => "ticketMessageId" in m
  );
  const inboundCount =
    row.inboundCount ??
    fullMessages.filter((m) => m.direction === "inbound").length;
  const outboundCount =
    row.outboundCount ??
    fullMessages.filter((m) => m.direction === "outbound").length;

  const last =
    row.lastActivity ??
    [...fullMessages]
      .filter((m) => m.direction !== "note" && !(m.isInternal ?? false))
      .sort((a, b) => {
        const ta = new Date(a.receivedAt ?? a.createdDtTm).getTime();
        const tb = new Date(b.receivedAt ?? b.createdDtTm).getTime();
        return tb - ta;
      })[0] ??
    null;

  return {
    ticketId: row.ticketId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    mailboxId: row.mailboxId,
    ticketNumber: row.ticketNumber,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    channel: row.channel,
    requesterName: row.requesterName,
    requesterEmail: row.requesterEmail,
    departmentId: row.departmentId ?? null,
    departmentName: row.departmentName ?? null,
    assigneeUserId: row.assigneeUserId ?? null,
    assigneeName: row.assigneeName ?? null,
    conversationId: row.conversationId,
    lastMessageAt: toIso(row.lastMessageAt),
    isActive: row.isActive,
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    messageCount: row._count?.messages ?? fullMessages.length,
    inboundCount,
    outboundCount,
    hasAgentReply: outboundCount > 0,
    lastActivityBy: last
      ? last.fromName || last.fromEmail || (last.direction === "outbound" ? "Agent" : "Customer")
      : null,
    lastActivityDirection: (last?.direction as HelpdeskTicket["lastActivityDirection"]) ?? null,
    messages: fullMessages.length ? fullMessages.map(toAppTicketMessage) : undefined,
    mailboxAddress: row.mailbox?.mailboxAddress ?? null,
  };
}
