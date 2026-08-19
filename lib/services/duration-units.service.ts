import { toAppDurationUnit, type DurationUnitRow } from "@/lib/mappers/duration-unit.mapper";
import type { DurationUnit } from "@/types";

export class DurationUnitsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "DurationUnitsApiError";
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

export async function listDurationUnits(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<DurationUnit[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/duration-units${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new DurationUnitsApiError(await parseError(res), res.status);
  return ((await res.json()) as DurationUnitRow[]).map(toAppDurationUnit);
}

export async function createDurationUnit(input: {
  durationUnitCode: string;
  durationUnitName: string;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<DurationUnit> {
  const res = await fetch("/api/duration-units", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DurationUnitsApiError(await parseError(res), res.status);
  return toAppDurationUnit(await res.json());
}

export async function updateDurationUnit(
  durationUnitId: number,
  input: {
    durationUnitCode: string;
    durationUnitName: string;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<DurationUnit> {
  const res = await fetch(`/api/duration-units/${durationUnitId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new DurationUnitsApiError(await parseError(res), res.status);
  return toAppDurationUnit(await res.json());
}

export async function setDurationUnitActive(
  durationUnitId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<DurationUnit> {
  const res = await fetch(`/api/duration-units/${durationUnitId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new DurationUnitsApiError(await parseError(res), res.status);
  return toAppDurationUnit(await res.json());
}

export async function deleteDurationUnit(durationUnitId: number): Promise<void> {
  const res = await fetch(`/api/duration-units/${durationUnitId}`, { method: "DELETE" });
  if (!res.ok) throw new DurationUnitsApiError(await parseError(res), res.status);
}
