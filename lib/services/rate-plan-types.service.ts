import { toAppRatePlanType, type RatePlanTypeRow } from "@/lib/mappers/rate-plan-type.mapper";
import type { RatePlanType } from "@/types";

export class RatePlanTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RatePlanTypesApiError";
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

export async function listRatePlanTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<RatePlanType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/rate-plan-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RatePlanTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as RatePlanTypeRow[]).map(toAppRatePlanType);
}

export async function createRatePlanType(input: {
  ratePlanTypeCode: string;
  ratePlanTypeName: string;
  description?: string | null;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<RatePlanType> {
  const res = await fetch("/api/rate-plan-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RatePlanTypesApiError(await parseError(res), res.status);
  return toAppRatePlanType(await res.json());
}

export async function updateRatePlanType(
  ratePlanTypeId: number,
  input: {
    ratePlanTypeCode: string;
    ratePlanTypeName: string;
    description?: string | null;
    displayOrder?: number;
    tenantId: number;
    companyId: number;
    isActive?: boolean;
    modifiedBy: number;
  }
): Promise<RatePlanType> {
  const res = await fetch(`/api/rate-plan-types/${ratePlanTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RatePlanTypesApiError(await parseError(res), res.status);
  return toAppRatePlanType(await res.json());
}

export async function setRatePlanTypeActive(
  ratePlanTypeId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<RatePlanType> {
  const res = await fetch(`/api/rate-plan-types/${ratePlanTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new RatePlanTypesApiError(await parseError(res), res.status);
  return toAppRatePlanType(await res.json());
}

export async function deleteRatePlanType(ratePlanTypeId: number): Promise<void> {
  const res = await fetch(`/api/rate-plan-types/${ratePlanTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new RatePlanTypesApiError(await parseError(res), res.status);
}
