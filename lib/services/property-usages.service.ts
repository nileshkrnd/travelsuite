import type { PropertyUsage } from "@/types";
import { toAppPropertyUsage, type PropertyLookupRow } from "@/lib/mappers/property.mapper";

export class PropertyUsagesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyUsagesApiError";
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

export async function listPropertyUsages(options?: { activeOnly?: boolean }): Promise<PropertyUsage[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-usages${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyUsagesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyLookupRow[]).map(toAppPropertyUsage);
}

export async function createPropertyUsage(input: {
  propertyUsageName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<PropertyUsage> {
  const res = await fetch("/api/property-usages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUsagesApiError(await parseError(res), res.status);
  return toAppPropertyUsage(await res.json());
}

export async function updatePropertyUsage(
  propertyUsageId: number,
  input: { propertyUsageName: string; isActive?: boolean; modifiedBy: number }
): Promise<PropertyUsage> {
  const res = await fetch(`/api/property-usages/${propertyUsageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyUsagesApiError(await parseError(res), res.status);
  return toAppPropertyUsage(await res.json());
}

export async function setPropertyUsageActive(
  propertyUsageId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyUsage> {
  const res = await fetch(`/api/property-usages/${propertyUsageId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyUsagesApiError(await parseError(res), res.status);
  return toAppPropertyUsage(await res.json());
}

export async function deletePropertyUsage(propertyUsageId: number): Promise<void> {
  const res = await fetch(`/api/property-usages/${propertyUsageId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyUsagesApiError(await parseError(res), res.status);
}
