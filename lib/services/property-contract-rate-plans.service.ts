import type { PropertyContractRatePlan } from "@/types";
import {
  toAppPropertyContractRatePlan,
  type PropertyContractRatePlanRow,
} from "@/lib/mappers/property-contract-rate-plan.mapper";

export class PropertyContractRatePlansApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "PropertyContractRatePlansApiError";
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

export interface PropertyContractRatePlanWriteInput {
  tenantId: number;
  companyId: number;
  propertyContractId: number;
  ratePlanCode: string;
  ratePlanName: string;
  ratePlanTypeId: number;
  mealPlanId: number;
  rateBasisId: number;
  isActive?: boolean;
  displayOrder?: number;
}

export async function listPropertyContractRatePlans(options?: {
  tenantId?: number;
  companyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractRatePlan[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-rate-plans${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractRatePlanRow[]).map(toAppPropertyContractRatePlan);
}

export async function getPropertyContractRatePlan(
  propertyContractRatePlanId: number
): Promise<PropertyContractRatePlan> {
  const res = await fetch(`/api/property-contract-rate-plans/${propertyContractRatePlanId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
  return toAppPropertyContractRatePlan(await res.json());
}

export async function createPropertyContractRatePlan(
  input: PropertyContractRatePlanWriteInput & { createdBy: number }
): Promise<PropertyContractRatePlan> {
  const res = await fetch("/api/property-contract-rate-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
  return toAppPropertyContractRatePlan(await res.json());
}

export async function updatePropertyContractRatePlan(
  propertyContractRatePlanId: number,
  input: PropertyContractRatePlanWriteInput & { modifiedBy: number }
): Promise<PropertyContractRatePlan> {
  const res = await fetch(`/api/property-contract-rate-plans/${propertyContractRatePlanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
  return toAppPropertyContractRatePlan(await res.json());
}

export async function setPropertyContractRatePlanActive(
  propertyContractRatePlanId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractRatePlan> {
  const res = await fetch(`/api/property-contract-rate-plans/${propertyContractRatePlanId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive, modifiedBy }),
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
  return toAppPropertyContractRatePlan(await res.json());
}

export async function deletePropertyContractRatePlan(
  propertyContractRatePlanId: number
): Promise<void> {
  const res = await fetch(`/api/property-contract-rate-plans/${propertyContractRatePlanId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new PropertyContractRatePlansApiError(await parseError(res), res.status);
}
