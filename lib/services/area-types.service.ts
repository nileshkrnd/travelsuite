import type { AreaType } from "@/types";
import { toAppAreaType, type AreaTypeRow } from "@/lib/mappers/geo.mapper";

export class AreaTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AreaTypesApiError";
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

export async function listAreaTypes(options?: {
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<AreaType[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/area-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AreaTypesApiError(await parseError(res), res.status);
  const data = (await res.json()) as AreaTypeRow[];
  return data.map(toAppAreaType);
}

export async function createAreaType(input: {
  areaTypeName: string;
  isActive?: boolean;
  createdBy: number;
}): Promise<AreaType> {
  const res = await fetch("/api/area-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AreaTypesApiError(await parseError(res), res.status);
  return toAppAreaType(await res.json());
}

export async function updateAreaType(
  areaTypeId: number,
  input: { areaTypeName: string; isActive?: boolean; modifiedBy: number }
): Promise<AreaType> {
  const res = await fetch(`/api/area-types/${areaTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AreaTypesApiError(await parseError(res), res.status);
  return toAppAreaType(await res.json());
}

export async function setAreaTypeActive(
  areaTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<AreaType> {
  const res = await fetch(`/api/area-types/${areaTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AreaTypesApiError(await parseError(res), res.status);
  return toAppAreaType(await res.json());
}

export async function deleteAreaType(areaTypeId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/area-types/${areaTypeId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new AreaTypesApiError(await parseError(res), res.status);
}
