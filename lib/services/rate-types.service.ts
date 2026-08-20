import { toAppRateType, type RateTypeRow } from "@/lib/mappers/rate-type.mapper";
import type { RateType } from "@/types";

export class RateTypesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "RateTypesApiError";
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

export async function listRateTypes(options?: {
  tenantId?: number;
  companyId?: number;
  rateTypeGroupId?: number;
  activeOnly?: boolean;
}): Promise<RateType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.rateTypeGroupId !== undefined) params.set("rateTypeGroupId", String(options.rateTypeGroupId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/rate-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new RateTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as RateTypeRow[]).map(toAppRateType);
}

export interface RateTypeWriteInput {
  rateTypeCode: string;
  rateTypeName: string;
  description?: string;
  rateTypeGroupId?: number | null;
  isPaxType?: boolean;
  isQuantityType?: boolean;
  displayOrder?: number;
  tenantId: number;
  companyId: number;
  isActive?: boolean;
}

export async function createRateType(input: RateTypeWriteInput & { createdBy: number }): Promise<RateType> {
  const res = await fetch("/api/rate-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RateTypesApiError(await parseError(res), res.status);
  return toAppRateType(await res.json());
}

export async function updateRateType(
  rateTypeId: number,
  input: RateTypeWriteInput & { modifiedBy: number }
): Promise<RateType> {
  const res = await fetch(`/api/rate-types/${rateTypeId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new RateTypesApiError(await parseError(res), res.status);
  return toAppRateType(await res.json());
}

export async function setRateTypeActive(rateTypeId: number, isActive: boolean, modifiedBy: number): Promise<RateType> {
  const res = await fetch(`/api/rate-types/${rateTypeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new RateTypesApiError(await parseError(res), res.status);
  return toAppRateType(await res.json());
}

export async function deleteRateType(rateTypeId: number): Promise<void> {
  const res = await fetch(`/api/rate-types/${rateTypeId}`, { method: "DELETE" });
  if (!res.ok) throw new RateTypesApiError(await parseError(res), res.status);
}
