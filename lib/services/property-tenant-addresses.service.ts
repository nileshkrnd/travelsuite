import {
  toAppPropertyTenantAddress,
  type PropertyTenantAddressRow,
} from "@/lib/mappers/property-tenant-address.mapper";
import type { PropertyTenantAddress } from "@/types";

export class PropertyTenantAddressesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTenantAddressesApiError";
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

export async function listPropertyTenantAddresses(options?: {
  propertyTenantId?: number;
  activeOnly?: boolean;
}): Promise<PropertyTenantAddress[]> {
  const params = new URLSearchParams();
  if (options?.propertyTenantId !== undefined) params.set("propertyTenantId", String(options.propertyTenantId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-tenant-addresses${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantAddressesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyTenantAddressRow[]).map(toAppPropertyTenantAddress);
}

export interface PropertyTenantAddressWriteInput {
  propertyTenantId: number;
  propertyTenantAddressTypeId: number;
  addressLine1: string;
  addressLine2?: string | null;
  area?: string | null;
  countryId: number;
  stateId?: number | null;
  cityId?: number | null;
  postalCode?: string | null;
  isPrimary?: boolean;
  isActive?: boolean;
}

export async function createPropertyTenantAddress(
  input: PropertyTenantAddressWriteInput & { createdBy: number }
): Promise<PropertyTenantAddress> {
  const res = await fetch("/api/property-tenant-addresses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantAddressesApiError(await parseError(res), res.status);
  return toAppPropertyTenantAddress(await res.json());
}

export async function updatePropertyTenantAddress(
  propertyTenantAddressId: number,
  input: Omit<PropertyTenantAddressWriteInput, "propertyTenantId"> & { modifiedBy: number }
): Promise<PropertyTenantAddress> {
  const res = await fetch(`/api/property-tenant-addresses/${propertyTenantAddressId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyTenantAddressesApiError(await parseError(res), res.status);
  return toAppPropertyTenantAddress(await res.json());
}

export async function deletePropertyTenantAddress(propertyTenantAddressId: number): Promise<void> {
  const res = await fetch(`/api/property-tenant-addresses/${propertyTenantAddressId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyTenantAddressesApiError(await parseError(res), res.status);
}
