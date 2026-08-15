import type { PropertyContractSeasonPeriod } from "@/types";
import {
  toAppPropertyContractSeasonPeriod,
  type PropertyContractSeasonPeriodRow,
} from "@/lib/mappers/property-contract-season-period.mapper";

export class PropertyContractSeasonPeriodsApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractSeasonPeriodsApiError";
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

export interface PropertyContractSeasonPeriodWriteInput {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  propertySeasonId: number;
  fromDate: string;
  toDate: string;
  isActive?: boolean;
}

export async function listPropertyContractSeasonPeriods(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  propertySeasonId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractSeasonPeriod[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.propertySeasonId !== undefined) {
    params.set("propertySeasonId", String(options.propertySeasonId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-season-periods${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractSeasonPeriodRow[]).map(toAppPropertyContractSeasonPeriod);
}

export async function getPropertyContractSeasonPeriod(
  propertyContractSeasonPeriodId: number
): Promise<PropertyContractSeasonPeriod> {
  const res = await fetch(`/api/property-contract-season-periods/${propertyContractSeasonPeriodId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
  return toAppPropertyContractSeasonPeriod(await res.json());
}

export async function createPropertyContractSeasonPeriod(
  input: PropertyContractSeasonPeriodWriteInput & { createdBy: number }
): Promise<PropertyContractSeasonPeriod> {
  const res = await fetch("/api/property-contract-season-periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
  return toAppPropertyContractSeasonPeriod(await res.json());
}

export async function updatePropertyContractSeasonPeriod(
  propertyContractSeasonPeriodId: number,
  input: PropertyContractSeasonPeriodWriteInput & { modifiedBy: number }
): Promise<PropertyContractSeasonPeriod> {
  const res = await fetch(`/api/property-contract-season-periods/${propertyContractSeasonPeriodId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
  return toAppPropertyContractSeasonPeriod(await res.json());
}

export async function setPropertyContractSeasonPeriodActive(
  propertyContractSeasonPeriodId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractSeasonPeriod> {
  const res = await fetch(`/api/property-contract-season-periods/${propertyContractSeasonPeriodId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
  return toAppPropertyContractSeasonPeriod(await res.json());
}

export async function deletePropertyContractSeasonPeriod(
  propertyContractSeasonPeriodId: number
): Promise<void> {
  const res = await fetch(`/api/property-contract-season-periods/${propertyContractSeasonPeriodId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractSeasonPeriodsApiError(await parseError(res), res.status);
}
