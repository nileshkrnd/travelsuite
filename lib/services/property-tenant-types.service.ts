import { toAppPropertyTenantType, type PropertyTenantTypeRow } from "@/lib/mappers/property-tenant-type.mapper";
import type { PropertyTenantType } from "@/types";

export class PropertyTenantTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyTenantTypesApiError";
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

export async function listPropertyTenantTypes(options?: { activeOnly?: boolean }): Promise<PropertyTenantType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-tenant-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyTenantTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyTenantTypeRow[]).map(toAppPropertyTenantType);
}
