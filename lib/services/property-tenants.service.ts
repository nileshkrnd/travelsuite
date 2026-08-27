import { toAppPropertyTenant, type PropertyTenantRow } from "@/lib/mappers/property-tenant.mapper";
import type { PropertyTenant } from "@/types";

export class PropertyTenantsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTenantsApiError";
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

export async function listPropertyTenants(options?: {
  tenantId?: number;
  companyId?: number;
  propertyTenantTypeId?: number;
  activeOnly?: boolean;
}): Promise<PropertyTenant[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyTenantTypeId !== undefined) params.set("propertyTenantTypeId", String(options.propertyTenantTypeId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-tenants${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyTenantRow[]).map(toAppPropertyTenant);
}

export async function getPropertyTenant(propertyTenantId: number): Promise<PropertyTenant> {
  const res = await fetch(`/api/property-tenants/${propertyTenantId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
  return toAppPropertyTenant(await res.json());
}

export interface PropertyTenantWriteInput {
  tenantCode: string;
  propertyTenantTypeId: number;
  tenantName: string;
  legalName?: string | null;
  registrationNumber?: string | null;
  taxRegistrationNumber?: string | null;
  nationalityId?: number | null;
  countryOfResidenceId?: number | null;
  countryId: number;
  cityId?: number | null;
  contactPersonName?: string | null;
  email?: string | null;
  mobileCountryCode?: string | null;
  mobileNumber?: string | null;
  statusId: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createPropertyTenant(input: PropertyTenantWriteInput & { createdBy: number }): Promise<PropertyTenant> {
  const res = await fetch("/api/property-tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
  return toAppPropertyTenant(await res.json());
}

export async function updatePropertyTenant(
  propertyTenantId: number,
  input: PropertyTenantWriteInput & { modifiedBy: number }
): Promise<PropertyTenant> {
  const res = await fetch(`/api/property-tenants/${propertyTenantId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
  return toAppPropertyTenant(await res.json());
}

export async function setPropertyTenantActive(
  propertyTenantId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyTenant> {
  const res = await fetch(`/api/property-tenants/${propertyTenantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
  return toAppPropertyTenant(await res.json());
}

export async function deletePropertyTenant(propertyTenantId: number): Promise<void> {
  const res = await fetch(`/api/property-tenants/${propertyTenantId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyTenantsApiError(await parseError(res), res.status);
}
