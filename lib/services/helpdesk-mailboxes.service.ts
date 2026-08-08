import type { HelpdeskMailbox } from "@/types/helpdesk-mailbox";

export class HelpdeskMailboxesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "HelpdeskMailboxesApiError";
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

export type HelpdeskMailboxWriteInput = {
  tenantId?: number;
  companyId?: number | null;
  mailboxAddress: string;
  displayName?: string | null;
  provider: "gmail" | "microsoft365";
  isShared?: boolean;
  isActive?: boolean;
  syncLookbackHours?: number;
  imapHost?: string | null;
  imapPort?: number | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  appPassword?: string | null;
  ms365TenantId?: string | null;
  ms365ClientId?: string | null;
  ms365ClientSecret?: string | null;
  createdBy?: number;
  modifiedBy?: number;
};

export async function listHelpdeskMailboxes(options: {
  tenantId: number;
  activeOnly?: boolean;
}): Promise<HelpdeskMailbox[]> {
  const params = new URLSearchParams({ tenantId: String(options.tenantId) });
  if (options.activeOnly) params.set("activeOnly", "true");
  const res = await fetch(`/api/helpdesk/mailboxes?${params}`, { cache: "no-store" });
  if (!res.ok) throw new HelpdeskMailboxesApiError(await parseError(res), res.status);
  return res.json();
}

export async function createHelpdeskMailbox(
  input: HelpdeskMailboxWriteInput & { tenantId: number; createdBy: number }
): Promise<HelpdeskMailbox> {
  const res = await fetch("/api/helpdesk/mailboxes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new HelpdeskMailboxesApiError(await parseError(res), res.status);
  return res.json();
}

export async function updateHelpdeskMailbox(
  mailboxId: number,
  input: HelpdeskMailboxWriteInput
): Promise<HelpdeskMailbox> {
  const res = await fetch(`/api/helpdesk/mailboxes/${mailboxId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new HelpdeskMailboxesApiError(await parseError(res), res.status);
  return res.json();
}

export async function setHelpdeskMailboxActive(
  mailboxId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<HelpdeskMailbox> {
  const res = await fetch(`/api/helpdesk/mailboxes/${mailboxId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new HelpdeskMailboxesApiError(await parseError(res), res.status);
  return res.json();
}

export async function deleteHelpdeskMailbox(mailboxId: number): Promise<void> {
  const res = await fetch(`/api/helpdesk/mailboxes/${mailboxId}`, { method: "DELETE" });
  if (!res.ok) throw new HelpdeskMailboxesApiError(await parseError(res), res.status);
}
