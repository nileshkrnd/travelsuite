/** Helpdesk mailbox master — Tenant Admin configures support inboxes. */
export type HelpdeskMailboxProvider = "gmail" | "microsoft365" | "whatsapp";

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
  /** Present for whatsapp when saved (non-secret). */
  waPhoneNumberId?: string | null;
  waBusinessAccountId?: string | null;
  /** True when a webhook verify token is stored (value never returned). */
  hasWaVerifyToken?: boolean;
  lastSyncAt: string | null;
  /** Cleared on successful sync; set when the last sync attempt failed. */
  lastSyncError?: string | null;
  createdBy: number | null;
  createdDtTm: string;
  modifiedBy: number | null;
  modifiedDtTm: string | null;
  ticketCount?: number;
}
