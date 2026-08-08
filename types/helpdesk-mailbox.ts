/** Helpdesk mailbox master — Tenant Admin configures support inboxes. */
export type HelpdeskMailboxProvider = "gmail" | "microsoft365";

export interface HelpdeskMailbox {
  mailboxId: number;
  tenantId: number;
  companyId: number | null;
  mailboxAddress: string;
  displayName: string | null;
  provider: HelpdeskMailboxProvider | string;
  isShared: boolean;
  isActive: boolean;
  syncLookbackHours: number;
  imapHost: string | null;
  imapPort: number | null;
  smtpHost: string | null;
  smtpPort: number | null;
  /** True when encrypted credentials exist (secret values are never returned). */
  hasCredentials: boolean;
  /** Present for microsoft365 when saved (non-secret). */
  ms365TenantId?: string | null;
  ms365ClientId?: string | null;
  lastSyncAt: string | null;
  createdBy: number | null;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  ticketCount?: number;
}
