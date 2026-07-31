import type { CurrencyCode, Tenant, TenantAddress, TenantContact, TenantStatus } from "@/types";
import { toAppTenant, type TenantRow } from "@/lib/mappers/tenant.mapper";

export class TenantsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "TenantsApiError";
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

function mapRow(row: TenantRow): Tenant {
  return toAppTenant(row);
}

export async function listTenants(): Promise<Tenant[]> {
  const res = await fetch("/api/tenants", { cache: "no-store" });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  const data = (await res.json()) as TenantRow[];
  return data.map(mapRow);
}

export async function getTenant(tenantId: number): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${tenantId}`, { cache: "no-store" });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function getTenantByUid(tenantUid: string): Promise<Tenant> {
  const res = await fetch(`/api/tenants?uid=${encodeURIComponent(tenantUid)}`, { cache: "no-store" });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  const data = (await res.json()) as TenantRow[];
  if (!data[0]) throw new TenantsApiError("Tenant not found", 404);
  return mapRow(data[0]);
}

export interface TenantWriteInput {
  tenantCode: string;
  tenantName: string;
  groupName?: string;
  defaultCurrency: CurrencyCode;
  supportedCurrencies?: CurrencyCode[];
  defaultLocale?: string;
  supportedLocales?: string[];
  defaultCultureId: number;
  supportedCultureIds: number[];
  primaryColor?: string;
  logoUrl?: string;
  address: TenantAddress;
  contact: TenantContact;
  status?: TenantStatus;
  createdBy?: number;
  modifiedBy?: number;
  /** Optional stable app id on create; defaults to tenant_{id} after insert if omitted. */
  tenantUid?: string;
}

export async function createTenant(input: TenantWriteInput): Promise<Tenant> {
  const res = await fetch("/api/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function updateTenant(tenantId: number, input: TenantWriteInput): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}

export async function setTenantStatus(
  tenantId: number,
  status: TenantStatus,
  modifiedBy: number
): Promise<Tenant> {
  const res = await fetch(`/api/tenants/${tenantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, modifiedBy }),
  });
  if (!res.ok) throw new TenantsApiError(await parseError(res), res.status);
  return mapRow(await res.json());
}
