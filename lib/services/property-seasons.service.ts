import type { PropertySeason } from "@/types";
import { toAppPropertySeason, type PropertySeasonRow } from "@/lib/mappers/property-season.mapper";

export class PropertySeasonsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertySeasonsApiError";
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

export interface PropertySeasonWriteInput {
  tenantId: number;
  companyId: number;
  propertyId: number;
  seasonCode: string;
  seasonName: string;
  displayOrder?: number;
  isActive?: boolean;
}

export async function listPropertySeasons(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  activeOnly?: boolean;
}): Promise<PropertySeason[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-seasons${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertySeasonRow[]).map(toAppPropertySeason);
}

export async function getPropertySeason(propertySeasonId: number): Promise<PropertySeason> {
  const res = await fetch(`/api/property-seasons/${propertySeasonId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
  return toAppPropertySeason(await res.json());
}

export async function createPropertySeason(
  input: PropertySeasonWriteInput & { createdBy: number }
): Promise<PropertySeason> {
  const res = await fetch("/api/property-seasons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
  return toAppPropertySeason(await res.json());
}

export async function updatePropertySeason(
  propertySeasonId: number,
  input: PropertySeasonWriteInput & { modifiedBy: number }
): Promise<PropertySeason> {
  const res = await fetch(`/api/property-seasons/${propertySeasonId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
  return toAppPropertySeason(await res.json());
}

export async function setPropertySeasonActive(
  propertySeasonId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertySeason> {
  const res = await fetch(`/api/property-seasons/${propertySeasonId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
  return toAppPropertySeason(await res.json());
}

export async function deletePropertySeason(propertySeasonId: number): Promise<void> {
  const res = await fetch(`/api/property-seasons/${propertySeasonId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertySeasonsApiError(await parseError(res), res.status);
}
