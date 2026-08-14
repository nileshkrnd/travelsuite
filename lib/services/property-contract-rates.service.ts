import type { PropertyContractRate, PropertyContractRateMatrixPayload } from "@/types";
import {
  toAppPropertyContractRate,
  type PropertyContractRateRow,
} from "@/lib/mappers/property-contract-rate.mapper";

export class PropertyContractRatesApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractRatesApiError";
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

export interface PropertyContractRateWriteInput {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  propertyContractRatePlanId: number;
  propertyRoomId: number;
  occupancyTypeId: number;
  rateAmount: number;
  isActive?: boolean;
}

export async function listPropertyContractRates(options?: {
  tenantId?: number;
  companyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractRate[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-rates${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractRateRow[]).map(toAppPropertyContractRate);
}

export async function getPropertyContractRate(
  propertyContractRateId: number
): Promise<PropertyContractRate> {
  const res = await fetch(`/api/property-contract-rates/${propertyContractRateId}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return toAppPropertyContractRate(await res.json());
}

export async function createPropertyContractRate(
  input: PropertyContractRateWriteInput & { createdBy: number }
): Promise<PropertyContractRate> {
  const res = await fetch("/api/property-contract-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return toAppPropertyContractRate(await res.json());
}

export async function updatePropertyContractRate(
  propertyContractRateId: number,
  input: PropertyContractRateWriteInput & { modifiedBy: number }
): Promise<PropertyContractRate> {
  const res = await fetch(`/api/property-contract-rates/${propertyContractRateId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return toAppPropertyContractRate(await res.json());
}

export async function setPropertyContractRateActive(
  propertyContractRateId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractRate> {
  const res = await fetch(`/api/property-contract-rates/${propertyContractRateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return toAppPropertyContractRate(await res.json());
}

export async function deletePropertyContractRate(propertyContractRateId: number): Promise<void> {
  const res = await fetch(`/api/property-contract-rates/${propertyContractRateId}`, { method: "DELETE" });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
}

export async function getPropertyContractRateMatrix(options: {
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  ratePlanTypeId: number;
}): Promise<PropertyContractRateMatrixPayload> {
  const params = new URLSearchParams({
    propertyContractId: String(options.propertyContractId),
    propertyContractSeasonPeriodId: String(options.propertyContractSeasonPeriodId),
    ratePlanTypeId: String(options.ratePlanTypeId),
  });
  const res = await fetch(`/api/property-contract-rates/matrix?${params}`, { cache: "no-store" });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return res.json();
}

export async function savePropertyContractRateMatrix(input: {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertyContractSeasonPeriodId: number;
  ratePlanTypeId: number;
  dayOfWeekIds: number[];
  createdBy: number;
  cells: {
    propertyContractRateId?: number;
    propertyContractRatePlanId: number;
    propertyRoomId: number;
    occupancyTypeId: number;
    rateAmount: number | null;
  }[];
}): Promise<{ saved: number; removed: number; matrix: PropertyContractRateMatrixPayload }> {
  const res = await fetch("/api/property-contract-rates/matrix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractRatesApiError(await parseError(res), res.status);
  return res.json();
}
