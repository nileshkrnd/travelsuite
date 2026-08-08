import { decryptMailboxCredentials } from "@/lib/helpdesk-credentials";
import type { HelpdeskMailbox } from "@/types/helpdesk-mailbox";

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toISOString();
}

export function toAppHelpdeskMailbox(row: {
  mailboxId: number;
  tenantId: number;
  companyId: number | null;
  mailboxAddress: string;
  displayName: string | null;
  provider: string;
  isShared: boolean;
  isActive: boolean;
  syncLookbackHours?: number;
  imapHost?: string | null;
  imapPort?: number | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  credentialsEnc?: string | null;
  lastSyncAt: Date | string | null;
  createdBy: number | null;
  createdDtTm: Date | string;
  modifiedBy: number | null;
  modifiedDtTm: Date | string | null;
  _count?: { tickets: number };
}): HelpdeskMailbox {
  let ms365TenantId: string | null = null;
  let ms365ClientId: string | null = null;
  if (row.credentialsEnc) {
    try {
      const creds = decryptMailboxCredentials(row.credentialsEnc);
      ms365TenantId = creds.ms365TenantId ?? null;
      ms365ClientId = creds.ms365ClientId ?? null;
    } catch {
      /* ignore decrypt for list display */
    }
  }

  return {
    mailboxId: row.mailboxId,
    tenantId: row.tenantId,
    companyId: row.companyId,
    mailboxAddress: row.mailboxAddress,
    displayName: row.displayName,
    provider: row.provider,
    isShared: row.isShared,
    isActive: row.isActive,
    syncLookbackHours: row.syncLookbackHours ?? 720,
    imapHost: row.imapHost ?? null,
    imapPort: row.imapPort ?? null,
    smtpHost: row.smtpHost ?? null,
    smtpPort: row.smtpPort ?? null,
    hasCredentials: !!row.credentialsEnc,
    ms365TenantId,
    ms365ClientId,
    lastSyncAt: toIso(row.lastSyncAt),
    createdBy: row.createdBy,
    createdDtTm: toIso(row.createdDtTm) ?? new Date().toISOString(),
    modifiedBy: row.modifiedBy,
    modifiedDtTm: toIso(row.modifiedDtTm),
    ticketCount: row._count?.tickets,
  };
}
