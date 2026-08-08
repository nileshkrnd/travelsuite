/** Helpdesk support ticket (Freshdesk-style email desk). */
export type HelpdeskTicketStatus = "open" | "pending" | "resolved" | "closed";
export type HelpdeskTicketPriority = "low" | "normal" | "high" | "urgent";

export interface HelpdeskTicketMessage {
  ticketMessageId: number;
  ticketId: number;
  graphMessageId: string | null;
  internetMessageId: string | null;
  direction: "inbound" | "outbound" | "note";
  isInternal: boolean;
  createdBy: number | null;
  fromName: string | null;
  fromEmail: string | null;
  toEmails: string | null;
  subject: string | null;
  bodyPreview: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  receivedAt: string | null;
  createdDtTm: string;
}

export interface HelpdeskTicket {
  ticketId: number;
  tenantId: number;
  companyId: number | null;
  mailboxId: number | null;
  ticketNumber: string;
  subject: string;
  status: HelpdeskTicketStatus | string;
  priority: HelpdeskTicketPriority | string;
  channel: string;
  requesterName: string | null;
  requesterEmail: string | null;
  departmentId: number | null;
  departmentName: string | null;
  assigneeUserId: number | null;
  assigneeName: string | null;
  conversationId: string | null;
  lastMessageAt: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  messageCount?: number;
  /** Customer inbound emails on the thread. */
  inboundCount?: number;
  /** Agent public replies sent. */
  outboundCount?: number;
  /** True when at least one agent reply exists. */
  hasAgentReply?: boolean;
  /** Last non-note activity actor (requester or agent). */
  lastActivityBy?: string | null;
  lastActivityDirection?: "inbound" | "outbound" | "note" | null;
  messages?: HelpdeskTicketMessage[];
  mailboxAddress?: string | null;
}
