import {
  toAppPropertyTenantAddressType,
  type PropertyTenantAddressTypeRow,
} from "@/lib/mappers/property-tenant-address-type.mapper";
import type { PropertyTenantAddressType } from "@/types";

export class PropertyTenantAddressTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTenantAddressTypesApiError";
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

export async function listPropertyTenantAddressTypes(options?: { activeOnly?: boolean }): Promise<PropertyTenantAddressType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-tenant-address-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantAddressTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyTenantAddressTypeRow[]).map(toAppPropertyTenantAddressType);
}
