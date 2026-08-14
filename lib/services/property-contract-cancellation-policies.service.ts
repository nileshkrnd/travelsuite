import type { CancellationPolicyType } from "@/types/cancellation-policy-type";
import type {
  PropertyContractCancellationPolicy,
  PropertyContractCancellationPolicyWrite,
} from "@/types/property-contract-cancellation-policy";
import { DEFAULT_CANCELLATION_POLICY_TYPES } from "@/lib/constants/cancellation-policy-types";
import {
  toAppCancellationPolicyType,
  toAppPropertyContractCancellationPolicy,
  type CancellationPolicyTypeRow,
  type PropertyContractCancellationPolicyRow,
} from "@/lib/mappers/property-contract-cancellation-policy.mapper";

export class CancellationPolicyTypesApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "CancellationPolicyTypesApiError";
  }
}

export class PropertyContractCancellationPolicyApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "PropertyContractCancellationPolicyApiError";
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

export async function listCancellationPolicyTypes(options?: {
  tenantId?: number;
  companyId?: number;
  activeOnly?: boolean;
}): Promise<CancellationPolicyType[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/cancellation-policy-types${qs ? `?${qs}` : ""}`, { cache: "no-store" });
  if (!res.ok) throw new CancellationPolicyTypesApiError(await parseError(res), res.status);
  return ((await res.json()) as CancellationPolicyTypeRow[]).map(toAppCancellationPolicyType);
}

export async function createCancellationPolicyType(input: {
  tenantId: number;
  companyId: number;
  cancellationPolicyTypeCode: string;
  cancellationPolicyTypeName: string;
  displayOrder?: number;
  isActive?: boolean;
  createdBy: number;
}): Promise<CancellationPolicyType> {
  const res = await fetch("/api/cancellation-policy-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new CancellationPolicyTypesApiError(await parseError(res), res.status);
  return toAppCancellationPolicyType(await res.json());
}

export async function ensureDefaultCancellationPolicyTypes(options: {
  tenantId: number;
  companyId: number;
  createdBy: number;
}): Promise<CancellationPolicyType[]> {
  const existing = await listCancellationPolicyTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: false,
  });
  const existingCodes = new Set(existing.map((t) => t.cancellationPolicyTypeCode.toUpperCase()));

  for (const [i, row] of DEFAULT_CANCELLATION_POLICY_TYPES.entries()) {
    if (existingCodes.has(row.code)) continue;
    try {
      await createCancellationPolicyType({
        tenantId: options.tenantId,
        companyId: options.companyId,
        cancellationPolicyTypeCode: row.code,
        cancellationPolicyTypeName: row.name,
        displayOrder: i,
        createdBy: options.createdBy,
      });
    } catch (err) {
      if (!(err instanceof CancellationPolicyTypesApiError && err.status === 409)) throw err;
    }
  }

  return listCancellationPolicyTypes({
    tenantId: options.tenantId,
    companyId: options.companyId,
    activeOnly: true,
  });
}

export async function listPropertyContractCancellationPolicies(options?: {
  tenantId?: number;
  companyId?: number;
  propertyId?: number;
  propertyContractId?: number;
  activeOnly?: boolean;
}): Promise<PropertyContractCancellationPolicy[]> {
  const params = new URLSearchParams();
  if (options?.tenantId !== undefined) params.set("tenantId", String(options.tenantId));
  if (options?.companyId !== undefined) params.set("companyId", String(options.companyId));
  if (options?.propertyId !== undefined) params.set("propertyId", String(options.propertyId));
  if (options?.propertyContractId !== undefined) {
    params.set("propertyContractId", String(options.propertyContractId));
  }
  if (options?.activeOnly) params.set("activeOnly", "true");
  const qs = params.toString();
  const res = await fetch(`/api/property-contract-cancellation-policies${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
  return ((await res.json()) as PropertyContractCancellationPolicyRow[]).map(
    toAppPropertyContractCancellationPolicy
  );
}

export async function getPropertyContractCancellationPolicy(
  propertyContractCancellationPolicyId: number
): Promise<PropertyContractCancellationPolicy> {
  const res = await fetch(
    `/api/property-contract-cancellation-policies/${propertyContractCancellationPolicyId}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractCancellationPolicy(await res.json());
}

export async function createPropertyContractCancellationPolicy(
  input: PropertyContractCancellationPolicyWrite & { createdBy: number }
): Promise<PropertyContractCancellationPolicy> {
  const res = await fetch("/api/property-contract-cancellation-policies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractCancellationPolicy(await res.json());
}

export async function updatePropertyContractCancellationPolicy(
  propertyContractCancellationPolicyId: number,
  input: PropertyContractCancellationPolicyWrite & { modifiedBy: number }
): Promise<PropertyContractCancellationPolicy> {
  const res = await fetch(
    `/api/property-contract-cancellation-policies/${propertyContractCancellationPolicyId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractCancellationPolicy(await res.json());
}

export async function setPropertyContractCancellationPolicyActive(
  propertyContractCancellationPolicyId: number,
  isActive: boolean,
  modifiedBy: number
): Promise<PropertyContractCancellationPolicy> {
  const res = await fetch(
    `/api/property-contract-cancellation-policies/${propertyContractCancellationPolicyId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive, modifiedBy }),
    }
  );
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
  return toAppPropertyContractCancellationPolicy(await res.json());
}

export async function deletePropertyContractCancellationPolicy(
  propertyContractCancellationPolicyId: number
): Promise<void> {
  const res = await fetch(
    `/api/property-contract-cancellation-policies/${propertyContractCancellationPolicyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new PropertyContractCancellationPolicyApiError(await parseError(res), res.status);
}
