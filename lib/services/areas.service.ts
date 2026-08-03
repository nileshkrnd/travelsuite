import type { Area } from "@/types";
import { toAppArea, type AreaRow } from "@/lib/mappers/geo.mapper";

export class AreasApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "AreasApiError";
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

export async function listAreas(options?: {
  countryId?: number;
  cityId?: number;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}): Promise<Area[]> {
  const params = new URLSearchParams();
  if (options?.countryId) params.set("countryId", String(options.countryId));
  if (options?.cityId) params.set("cityId", String(options.cityId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  if (options?.includeDeleted) params.set("includeDeleted", "true");
  const qs = params.toString();
  const res = await fetch(`/api/areas${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new AreasApiError(await parseError(res), res.status);
  const data = (await res.json()) as AreaRow[];
  return data.map(toAppArea);
}

export interface AreaWriteInput {
  countryId: number;
  cityId: number;
  areaCode: string;
  areaName: string;
  nativeName?: string;
  areaTypeId?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string;
  displayOrder?: number;
  isPopular?: boolean;
  isActive?: boolean;
  createdBy?: number;
  modifiedBy?: number;
}

export async function createArea(input: AreaWriteInput): Promise<Area> {
  const res = await fetch("/api/areas", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AreasApiError(await parseError(res), res.status);
  return toAppArea(await res.json());
}

export async function updateArea(areaId: number, input: AreaWriteInput): Promise<Area> {
  const res = await fetch(`/api/areas/${areaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new AreasApiError(await parseError(res), res.status);
  return toAppArea(await res.json());
}

export async function setAreaActive(areaId: number, isActive: boolean, modifiedBy: number): Promise<Area> {
  const res = await fetch(`/api/areas/${areaId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new AreasApiError(await parseError(res), res.status);
  return toAppArea(await res.json());
}

export async function deleteArea(areaId: number, modifiedBy: number): Promise<void> {
  const res = await fetch(`/api/areas/${areaId}?modifiedBy=${modifiedBy}`, { method: "DELETE" });
  if (!res.ok) throw new AreasApiError(await parseError(res), res.status);
}
